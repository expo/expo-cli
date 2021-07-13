import {
  getConfig,
  isLegacyImportsEnabled,
  readConfigJson,
  writeConfigJsonAsync,
} from '@expo/config';
import { ExpoConfig } from '@expo/config-types';
import JsonFile from '@expo/json-file';
import * as PackageManager from '@expo/package-manager';
import chalk from 'chalk';
import program, { Command } from 'commander';
import getenv from 'getenv';
import difference from 'lodash/difference';
import omit from 'lodash/omit';
import pickBy from 'lodash/pickBy';
import resolveFrom from 'resolve-from';
import semver from 'semver';
import terminalLink from 'terminal-link';
import { Android, Project, ProjectSettings, Simulator, Versions } from 'xdl';

import CommandError from '../CommandError';
import Log from '../log';
import { confirmAsync, selectAsync } from '../prompts';
import { logNewSection } from '../utils/ora';
import { findProjectRootAsync } from './utils/ProjectUtils';
import { getBundledNativeModulesAsync } from './utils/bundledNativeModules';
import { assertProjectHasExpoExtensionFilesAsync } from './utils/deprecatedExtensionWarnings';
import maybeBailOnGitStatusAsync from './utils/maybeBailOnGitStatusAsync';

type DependencyList = Record<string, string>;

type Options = {
  npm?: boolean;
  yarn?: boolean;
};

export type ExpoWorkflow = 'managed' | 'bare';

export type TargetSDKVersion = Pick<
  Versions.SDKVersion,
  | 'expoReactNativeTag'
  | 'facebookReactVersion'
  | 'facebookReactNativeVersion'
  | 'relatedPackages'
  | 'iosClientVersion'
  | 'iosClientUrl'
  | 'androidClientVersion'
  | 'androidClientUrl'
  | 'beta'
>;

export function maybeFormatSdkVersion(sdkVersionString: string | null): string | null {
  if (typeof sdkVersionString !== 'string' || sdkVersionString === 'UNVERSIONED') {
    return sdkVersionString;
  }

  // semver.valid type doesn't accept null, so need to ensure we pass a string
  return semver.valid(semver.coerce(sdkVersionString) || '');
}

/**
 * Read the version of an installed package from package.json in node_modules
 * This is preferable to reading it from the project package.json because we get
 * the exact installed version and not a range.
 */
async function getExactInstalledModuleVersionAsync(moduleName: string, projectRoot: string) {
  try {
    const pkg = await JsonFile.readAsync(resolveFrom(projectRoot, `${moduleName}/package.json`));
    return pkg.version as string;
  } catch (e) {
    return null;
  }
}

/**
 * Produce a list of dependencies used by the project that need to be updated
 */
export async function getUpdatedDependenciesAsync(
  projectRoot: string,
  workflow: ExpoWorkflow,
  targetSdkVersion: TargetSDKVersion | null,
  targetSdkVersionString: string
): Promise<{ dependencies: DependencyList; removed: string[] }> {
  // Get the updated version for any bundled modules
  const { exp, pkg } = getConfig(projectRoot);

  const bundledNativeModules = await getBundledNativeModulesAsync(
    projectRoot,
    targetSdkVersionString
  );

  // Smoosh regular and dev dependencies together for now
  const projectDependencies = { ...pkg.dependencies, ...pkg.devDependencies };

  const dependencies = getDependenciesFromBundledNativeModules({
    projectDependencies,
    bundledNativeModules,
    sdkVersion: exp.sdkVersion,
    workflow,
    targetSdkVersion,
  });

  const removed: string[] = [];

  // Add expo-random as a dependency if using expo-auth-session and upgrading to
  // a version where it has been moved to a peer dependency.
  // We can remove this when we no longer support SDK versions < 40, or have a
  // better way of installing peer dependencies.
  if (
    dependencies['expo-auth-session'] &&
    !dependencies['expo-random'] &&
    semver.gte(targetSdkVersionString, '40.0.0')
  ) {
    dependencies['expo-random'] = bundledNativeModules['expo-random'];
  }

  if (
    dependencies['@react-native-community/async-storage'] &&
    semver.gte(targetSdkVersionString, '41.0.0')
  ) {
    dependencies['@react-native-async-storage/async-storage'] =
      bundledNativeModules['@react-native-async-storage/async-storage'];
    removed.push('@react-native-community/async-storage');
  }

  return { dependencies, removed };
}

export type UpgradeDependenciesOptions = {
  projectDependencies: DependencyList;
  bundledNativeModules: DependencyList;
  sdkVersion?: string;
  workflow: ExpoWorkflow;
  targetSdkVersion: TargetSDKVersion | null;
};

export function getDependenciesFromBundledNativeModules({
  projectDependencies,
  bundledNativeModules,
  sdkVersion,
  workflow,
  targetSdkVersion,
}: UpgradeDependenciesOptions): DependencyList {
  const result: DependencyList = {};

  Object.keys(bundledNativeModules).forEach(name => {
    if (projectDependencies[name]) {
      result[name] = bundledNativeModules[name];
    }
  });

  // If sdkVersion is known and jest-expo is used, then upgrade to the current sdk version
  // jest-expo is versioned with expo because jest-expo mocks out the native SDKs used it expo.
  if (sdkVersion && projectDependencies['jest-expo']) {
    let jestExpoVersion = `^${sdkVersion}`;
    if (targetSdkVersion?.beta) {
      jestExpoVersion = `${jestExpoVersion}-beta`;
    }
    result['jest-expo'] = jestExpoVersion;
  }

  if (!targetSdkVersion) {
    Log.newLine();
    Log.warn(
      `Supported react, react-native, and react-dom versions are unknown because we don't have version information for the target SDK, please update them manually.`
    );
    return result;
  }

  // Get the supported react/react-native/react-dom versions and other related packages
  if (workflow === 'managed' || projectDependencies['expokit']) {
    result[
      'react-native'
    ] = `https://github.com/expo/react-native/archive/${targetSdkVersion.expoReactNativeTag}.tar.gz`;
  } else {
    result['react-native'] = targetSdkVersion.facebookReactNativeVersion;
  }

  // React version apparently is optional in SDK version data
  if (targetSdkVersion.facebookReactVersion) {
    result['react'] = targetSdkVersion.facebookReactVersion;

    // react-dom version is always the same as the react version
    if (projectDependencies['react-dom']) {
      result['react-dom'] = targetSdkVersion.facebookReactVersion;
    }
  }

  // Update any related packages
  if (targetSdkVersion.relatedPackages) {
    Object.keys(targetSdkVersion.relatedPackages).forEach(name => {
      if (projectDependencies[name]) {
        result[name] = targetSdkVersion.relatedPackages![name];
      }
    });
  }

  return result;
}

async function makeBreakingChangesToConfigAsync(
  projectRoot: string,
  targetSdkVersionString: string
): Promise<void> {
  const step = logNewSection(
    'Updating your app.json to account for breaking changes (if applicable)...'
  );

  const { exp: currentExp, dynamicConfigPath, staticConfigPath } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
  });

  // Bail out early if we have a dynamic config!
  if (dynamicConfigPath) {
    // IMPORTANT: this must be updated whenever you apply a new breaking change!
    if (targetSdkVersionString === '37.0.0') {
      step.succeed(
        `Only static configuration files can be updated, please update ${dynamicConfigPath} manually according to the release notes.`
      );
    } else {
      step.succeed('No additional changes necessary to app config.');
    }
    return;
  } else if (!staticConfigPath) {
    // No config in the project, modifications don't need to be made.
    // NOTICE: If we ever need to just simply add a value to the config for no reason, this check would break that.
    step.succeed('No config present, skipping updates.');
    return;
  }

  const { rootConfig } = readConfigJson(projectRoot);
  try {
    switch (targetSdkVersionString) {
      // IMPORTANT: adding a new case here? be sure to update the dynamic config situation above
      case '37.0.0':
        if (rootConfig?.expo?.androidNavigationBar?.visible !== undefined) {
          // @ts-ignore: boolean | enum not supported in JSON schemas
          if (rootConfig?.expo.androidNavigationBar?.visible === false) {
            step.succeed(
              `Updated "androidNavigationBar.visible" property in app.json to "leanback"...`
            );
            rootConfig.expo.androidNavigationBar.visible = 'leanback';
            // @ts-ignore: boolean | enum not supported in JSON schemas
          } else if (rootConfig?.expo.androidNavigationBar?.visible === true) {
            step.succeed(
              `Removed extraneous "androidNavigationBar.visible" property in app.json...`
            );
            delete rootConfig?.expo.androidNavigationBar?.visible;
          } else {
            // They had some invalid property for androidNavigationBar already...
            step.succeed('No additional changes necessary to app.json config.');
            return;
          }
          await writeConfigJsonAsync(projectRoot, rootConfig.expo);
        } else if (currentExp?.androidNavigationBar?.visible !== undefined) {
          step.stopAndPersist({
            symbol: '⚠️ ',
            text: chalk.red(
              `Please manually update "androidNavigationBar.visible" according to ${terminalLink(
                'this documentation',
                'https://docs.expo.io/versions/latest/config/app/#androidnavigationbar'
              )}`
            ),
          });
        } else {
          step.succeed('No additional changes necessary to app.json config.');
        }
        break;
      default:
        step.succeed('No additional changes necessary to app.json config.');
    }
  } catch (e) {
    step.fail(
      `Something went wrong when attempting to update app.json configuration: ${e.message}`
    );
  }
}

async function maybeBailOnUnsafeFunctionalityAsync(
  exp: Pick<ExpoConfig, 'sdkVersion'>
): Promise<boolean> {
  // Give people a chance to bail out if they're updating from a super old version because YMMV
  if (!Versions.gteSdkVersion(exp, '33.0.0')) {
    if (program.nonInteractive) {
      Log.warn(
        `This command works best on SDK 33 and higher. Because the command is running in nonInteractive mode it'll continue regardless.`
      );
      return true;
    }

    const answer = await confirmAsync({
      message: `This command works best on SDK 33 and higher. We can try updating for you, but you will likely need to follow up with the instructions from https://docs.expo.io/workflow/upgrading-expo-sdk-walkthrough/. Continue anyways?`,
    });

    if (!answer) {
      return true;
    }

    Log.newLine();
  }
  return false;
}

async function stopExpoServerAsync(projectRoot: string): Promise<void> {
  // Can't upgrade if Expo is running
  const status = await ProjectSettings.getCurrentStatusAsync(projectRoot);
  if (status === 'running') {
    await Project.stopAsync(projectRoot);
    Log.log(
      chalk.bold.underline(
        'We found an existing expo-cli instance running for this project and closed it to continue.'
      )
    );
    Log.addNewLineIfNone();
  }
}

async function shouldBailWhenUsingLatest(
  currentSdkVersionString: string,
  targetSdkVersionString: string
): Promise<boolean> {
  // Maybe bail out early if people are trying to update to the current version
  if (targetSdkVersionString === currentSdkVersionString) {
    if (program.nonInteractive) {
      Log.warn(
        `You are already using the latest SDK version but the command will continue because nonInteractive is enabled.`
      );
      Log.newLine();
      return false;
    }
    const answer = await confirmAsync({
      message: `You are already using the latest SDK version. Do you want to run the update anyways? This may be useful to ensure that all of your packages are set to the correct version.`,
    });

    if (!answer) {
      Log.log('Follow the Expo blog at https://blog.expo.io for new release information!');
      Log.newLine();
      return true;
    }

    Log.newLine();
  }

  return false;
}

async function shouldUpgradeSimulatorAsync(): Promise<boolean> {
  // Check if we can, and probably should, upgrade the (ios) simulator
  if (!Simulator.isPlatformSupported()) {
    return false;
  }
  if (program.nonInteractive) {
    Log.warn(`Skipping attempt to upgrade the client app on iOS simulator.`);
    return false;
  }

  const answer = await confirmAsync({
    message: 'Would you like to upgrade the Expo app in the iOS simulator?',
    initial: false,
  });

  Log.newLine();
  return answer;
}

async function maybeUpgradeSimulatorAsync(sdkVersion: TargetSDKVersion) {
  // Check if we can, and probably should, upgrade the (ios) simulator
  if (await shouldUpgradeSimulatorAsync()) {
    const result = await Simulator.upgradeExpoAsync({
      url: sdkVersion.iosClientUrl,
      version: sdkVersion.iosClientVersion,
    });
    if (!result) {
      Log.error(
        "The upgrade of your simulator didn't go as planned. You might have to reinstall it manually with expo client:install:ios."
      );
    }

    Log.newLine();
  }
}

async function shouldUpgradeEmulatorAsync(): Promise<boolean> {
  // Check if we can, and probably should, upgrade the android client
  if (!Android.isPlatformSupported()) {
    return false;
  }
  if (program.nonInteractive) {
    Log.warn(`Skipping attempt to upgrade the Expo app on the Android emulator.`);
    return false;
  }

  const answer = await confirmAsync({
    message: 'Would you like to upgrade the Expo app in the Android emulator?',
    initial: false,
  });

  Log.newLine();
  return answer;
}

async function maybeUpgradeEmulatorAsync(sdkVersion: TargetSDKVersion) {
  // Check if we can, and probably should, upgrade the android client
  if (await shouldUpgradeEmulatorAsync()) {
    const result = await Android.upgradeExpoAsync({
      url: sdkVersion.androidClientUrl,
      version: sdkVersion.androidClientVersion,
    });
    if (!result) {
      Log.error(
        "The upgrade of your Android client didn't go as planned. You might have to reinstall it manually with expo client:install:android."
      );
    }
    Log.newLine();
  }
}

async function promptSelectSDKVersionAsync(
  sdkVersions: string[],
  exp: Pick<ExpoConfig, 'sdkVersion'>
): Promise<string> {
  const sdkVersionStringOptions = sdkVersions.filter(
    v => semver.lte('33.0.0', v) && !Versions.gteSdkVersion(exp, v)
  );

  return await selectAsync({
    message: 'Choose a SDK version to upgrade to:',
    limit: 20,
    choices: sdkVersionStringOptions.map(sdkVersionString => ({
      value: sdkVersionString,
      title: chalk.bold(sdkVersionString),
    })),
  });
}

export async function upgradeAsync(
  {
    requestedSdkVersion,
    projectRoot,
    workflow,
  }: {
    requestedSdkVersion: string | null;
    projectRoot: string;
    workflow: ExpoWorkflow;
  },
  options: Options
) {
  // Force updating the versions cache
  await Versions.versionsAsync({ skipCache: true });

  const { exp, pkg } = await getConfig(projectRoot);

  if (await maybeBailOnGitStatusAsync()) return;

  if (await maybeBailOnUnsafeFunctionalityAsync(exp)) return;

  await stopExpoServerAsync(projectRoot);

  const currentSdkVersionString = exp.sdkVersion!;
  const sdkVersions = await Versions.releasedSdkVersionsAsync();
  const latestSdkVersion = await Versions.newestReleasedSdkVersionAsync();
  const latestSdkVersionString = latestSdkVersion.version;
  let targetSdkVersionString =
    maybeFormatSdkVersion(requestedSdkVersion) || latestSdkVersion.version;
  let targetSdkVersion = sdkVersions[targetSdkVersionString];

  const previousReactNativeVersion = await getExactInstalledModuleVersionAsync(
    'react-native',
    projectRoot
  );

  // Maybe bail out early if people are trying to update to the current version
  if (await shouldBailWhenUsingLatest(currentSdkVersionString, targetSdkVersionString)) return;

  const platforms = exp.platforms || [];

  if (
    targetSdkVersionString === latestSdkVersionString &&
    currentSdkVersionString !== targetSdkVersionString &&
    !program.nonInteractive
  ) {
    const answer = await confirmAsync({
      message: `You are currently using SDK ${currentSdkVersionString}. Would you like to update to the latest version, ${latestSdkVersion.version}?`,
    });

    Log.newLine();

    if (!answer) {
      const selectedSdkVersionString = await promptSelectSDKVersionAsync(
        Object.keys(sdkVersions),
        exp
      );

      // This has to exist because it's based on keys already present in sdkVersions
      targetSdkVersion = sdkVersions[selectedSdkVersionString];
      targetSdkVersionString = selectedSdkVersionString;
      Log.newLine();
    }
  } else if (!targetSdkVersion) {
    // This is useful when testing the beta internally, before actually
    // releasing it as a public beta. At this point, we won't have "beta" set on
    // the versions endpoint and so Versions.releasedSdkVersionsAsync will not
    // return the beta version, even with the EXPO_BETA flag set.
    if (getenv.boolish('EXPO_BETA', false)) {
      const allSdkVersions = await Versions.sdkVersionsAsync();
      targetSdkVersion = allSdkVersions[targetSdkVersionString];
    }

    // If we still don't have a version, even after searching through unreleased versions
    // when the EXPO_BETA flag is set, then we will just bail out because this is not
    // going to work!
    if (!targetSdkVersion) {
      const sdkVersionNumbers = Object.keys(sdkVersions).map(value => parseInt(value, 10));
      const minSdkVersion = sdkVersionNumbers.reduce(
        (val, acc) => Math.min(val, acc),
        sdkVersionNumbers[0]
      );
      const maxSdkVersion = sdkVersionNumbers.reduce(
        (val, acc) => Math.max(val, acc),
        sdkVersionNumbers[0]
      );
      throw new CommandError(
        `You provided the target SDK version value of ${targetSdkVersionString}, which does not seem to exist.\n` +
          `Valid SDK versions are in the range of ${minSdkVersion}.0.0 to ${maxSdkVersion}.0.0.`
      );
    }
  }

  // Check if we can, and probably should, upgrade the (ios) simulator
  if (platforms.includes('ios') && targetSdkVersion.iosClientUrl) {
    await maybeUpgradeSimulatorAsync(targetSdkVersion);
  }

  // Check if we can, and probably should, upgrade the android client
  if (platforms.includes('android') && targetSdkVersion.androidClientUrl) {
    await maybeUpgradeEmulatorAsync(targetSdkVersion);
  }

  const packageManager = PackageManager.createForProject(projectRoot, {
    npm: options.npm,
    yarn: options.yarn,
    log: Log.log,
    silent: !getenv.boolish('EXPO_DEBUG', false),
  });

  Log.addNewLineIfNone();

  const expoPackageToInstall = getenv.boolish('EXPO_BETA', false)
    ? `expo@next`
    : `expo@^${targetSdkVersionString}`;

  // Skip installing the Expo package again if it's already installed. @satya164
  // wanted this in order to work around an issue with yarn workspaces on
  // react-navigation.
  if (targetSdkVersionString !== currentSdkVersionString) {
    const installingPackageStep = logNewSection(
      `Installing the ${expoPackageToInstall} package...`
    );
    Log.addNewLineIfNone();
    try {
      await packageManager.addAsync(expoPackageToInstall);
    } catch (e) {
      installingPackageStep.fail(`Failed to install expo package with error: ${e.message}`);
      throw e;
    }
    installingPackageStep.succeed(`Installed ${expoPackageToInstall}`);
  }

  // Evaluate project config (app.config.js)
  const { exp: currentExp, dynamicConfigPath, staticConfigPath } = getConfig(projectRoot);

  const removingSdkVersionStep = logNewSection('Validating configuration.');

  if (dynamicConfigPath) {
    if (
      !Versions.gteSdkVersion(currentExp, targetSdkVersionString) &&
      currentExp.sdkVersion !== 'UNVERSIONED'
    ) {
      Log.addNewLineIfNone();
      removingSdkVersionStep.warn(
        'Please manually delete the sdkVersion field in your project app config file. It is now automatically determined based on the expo package version in your package.json.'
      );
    } else {
      removingSdkVersionStep.succeed('Validated configuration.');
    }
  } else if (staticConfigPath) {
    try {
      const { rootConfig } = readConfigJson(projectRoot);
      if (rootConfig.expo.sdkVersion && rootConfig.expo.sdkVersion !== 'UNVERSIONED') {
        Log.addNewLineIfNone();
        await writeConfigJsonAsync(projectRoot, { sdkVersion: undefined });
        removingSdkVersionStep.succeed('Removed deprecated sdkVersion field from app.json.');
      } else {
        removingSdkVersionStep.succeed('Validated configuration.');
      }
    } catch {
      removingSdkVersionStep.fail('Unable to validate configuration.');
    }
  } else {
    // No config present, nothing to change
    removingSdkVersionStep.succeed('Validated configuration.');
  }

  await makeBreakingChangesToConfigAsync(projectRoot, targetSdkVersionString);

  const updatingPackagesStep = logNewSection(
    'Updating packages to compatible versions (where known).'
  );

  Log.addNewLineIfNone();

  // Get all updated packages
  const { dependencies: updates, removed } = await getUpdatedDependenciesAsync(
    projectRoot,
    workflow,
    targetSdkVersion,
    targetSdkVersionString
  );

  // Split updated packages by dependencies and devDependencies
  const devDependencies = pickBy(updates, (_version, name) => pkg.devDependencies?.[name]);
  const devDependenciesAsStringArray = Object.keys(devDependencies).map(
    name => `${name}@${updates[name]}`
  );

  // Anything that isn't in devDependencies must be a dependency
  const dependencies = omit(updates, Object.keys(devDependencies));
  const dependenciesAsStringArray = Object.keys(dependencies).map(
    name => `${name}@${updates[name]}`
  );

  // Install dev dependencies
  if (devDependenciesAsStringArray.length) {
    try {
      await packageManager.addDevAsync(...devDependenciesAsStringArray);
    } catch (e) {
      updatingPackagesStep.fail(
        `Failed to upgrade JavaScript devDependencies: ${devDependenciesAsStringArray.join(' ')}`
      );
    }
  }

  // Install dependencies
  if (dependenciesAsStringArray.length) {
    try {
      await packageManager.addAsync(...dependenciesAsStringArray);
    } catch (e) {
      updatingPackagesStep.fail(
        `Failed to upgrade JavaScript dependencies: ${dependenciesAsStringArray.join(' ')}`
      );
    }
  }

  if (removed.length) {
    try {
      await packageManager.removeAsync(...removed);
    } catch (e) {
      updatingPackagesStep.fail(`Failed to remove JavaScript dependencies: ${removed.join(' ')}`);
    }
  }

  updatingPackagesStep.succeed('Updated known packages to compatible versions.');

  // Remove package-lock.json and node_modules if using npm instead of yarn. See the function
  // for more information on why.
  await maybeCleanNpmStateAsync(packageManager);

  const clearingCacheStep = logNewSection('Clearing the packager cache.');
  try {
    await Project.startReactNativeServerAsync({
      projectRoot,
      options: { reset: true, nonPersistent: true },
    });
  } catch (e) {
    clearingCacheStep.fail(`Failed to clear packager cache with error: ${e.message}`);
  } finally {
    try {
      // Ensure that we at least attempt to stop the server even if it failed to clear the cache
      // It was pointed out to me that "Connecting to Metro bundler failed." could occur which would lead
      // to the upgrade command not exiting upon completion because, I believe, the server remained open.
      await Project.stopReactNativeServerAsync(projectRoot);
    } catch {}

    clearingCacheStep.succeed('Cleared packager cache.');
  }

  // Warn about extensions out of sync. Remove after dropping support for SDK 41
  if (!isLegacyImportsEnabled(exp)) {
    await assertProjectHasExpoExtensionFilesAsync(projectRoot, true);
  }

  Log.newLine();
  Log.log(chalk.bold.green(`👏 Automated upgrade steps complete.`));
  Log.log(chalk.bold.grey(`...but this doesn't mean everything is done yet!`));
  Log.newLine();

  // List packages that were updated
  Log.log(chalk.bold(`✅ The following packages were updated:`));
  Log.log(chalk.grey.bold([...Object.keys(updates), ...['expo']].join(', ')));
  Log.addNewLineIfNone();

  if (removed.length) {
    Log.addNewLineIfNone();
    Log.log(chalk.bold(`🗑️ The following packages were removed:`));
    Log.log(chalk.grey.bold(removed.join(', ')));
    Log.addNewLineIfNone();
  }

  // List packages that were not updated
  const allDependencies = { ...pkg.dependencies, ...pkg.devDependencies };
  const untouchedDependencies = difference(Object.keys(allDependencies), [
    ...Object.keys(updates),
    'expo',
  ]);
  if (untouchedDependencies.length) {
    Log.addNewLineIfNone();
    Log.log(
      chalk.bold(
        `🚨 The following packages were ${chalk.underline(
          'not'
        )} updated. You should check the READMEs for those repositories to determine what version is compatible with your new set of packages:`
      )
    );
    Log.log(chalk.grey.bold(untouchedDependencies.join(', ')));
    Log.addNewLineIfNone();
  }

  if (removed.includes('@react-native-community/async-storage')) {
    Log.addNewLineIfNone();
    Log.log(
      chalk.bold(
        `🚨 @react-native-community/async-storage has been renamed to @react-native-async-storage/async-storage. The dependency has been updated automatically, you will now need to either update the imports in your source code manually, or run \`npx expo-codemod sdk41-async-storage './**/*'\`.`
      )
    );
    Log.addNewLineIfNone();
  }

  // Add some basic additional instructions for bare workflow
  if (workflow === 'bare') {
    Log.addNewLineIfNone();

    // The upgrade helper only accepts exact version, so in case we use version range expressions in our
    // versions data let's read the version from the source of truth - package.json in node_modules.
    const newReactNativeVersion = await getExactInstalledModuleVersionAsync(
      'react-native',
      projectRoot
    );

    // It's possible that the developer has upgraded react-native already because it's bare workflow.
    // If the version is the same, we don't need to provide an upgrade helper link.
    // If for some reason we are unable to resolve the previous/new react-native version, just skip this information.
    if (
      previousReactNativeVersion &&
      newReactNativeVersion &&
      !semver.eq(previousReactNativeVersion, newReactNativeVersion)
    ) {
      const upgradeHelperUrl = `https://react-native-community.github.io/upgrade-helper/`;

      if (semver.lt(previousReactNativeVersion, newReactNativeVersion)) {
        Log.log(
          chalk.bold(
            `⬆️  To finish your react-native upgrade, update your native projects as outlined here:
${chalk.gray(`${upgradeHelperUrl}?from=${previousReactNativeVersion}&to=${newReactNativeVersion}`)}`
          )
        );
      } else {
        Log.log(
          chalk.bold(
            `👉 react-native has been changed from ${previousReactNativeVersion} to ${newReactNativeVersion} because this is the version used in SDK ${targetSdkVersionString}.`
          )
        );
        Log.log(
          chalk.bold(
            chalk.grey(
              `Bare workflow apps are free to adjust their react-native version at the developer's discretion. You may want to re-install react-native@${previousReactNativeVersion} before proceeding.`
            )
          )
        );
      }

      Log.newLine();
    }

    Log.log(
      chalk.bold(
        `🏗  Run ${chalk.grey(
          'pod install'
        )} in your iOS directory and then re-build your native projects to compile the updated dependencies.`
      )
    );
    Log.addNewLineIfNone();
  }

  if (targetSdkVersion && targetSdkVersion.releaseNoteUrl) {
    Log.log(
      `Please refer to the release notes for information on any further required steps to update and information about breaking changes:`
    );
    Log.log(chalk.bold(targetSdkVersion.releaseNoteUrl));
  } else {
    if (getenv.boolish('EXPO_BETA', false)) {
      Log.gray(
        `Release notes are not available for beta releases. Please refer to the CHANGELOG: https://github.com/expo/expo/blob/master/CHANGELOG.md.`
      );
    } else {
      Log.gray(
        `Unable to find release notes for ${targetSdkVersionString}, please try to find them on https://blog.expo.io to learn more about other potentially important upgrade steps and breaking changes.`
      );
    }
  }

  const skippedSdkVersions = pickBy(sdkVersions, (_data, sdkVersionString) => {
    return (
      semver.lt(sdkVersionString, targetSdkVersionString) &&
      semver.gt(sdkVersionString, currentSdkVersionString)
    );
  });

  const skippedSdkVersionKeys = Object.keys(skippedSdkVersions);
  if (skippedSdkVersionKeys.length) {
    Log.newLine();

    const releaseNotesUrls = Object.values(skippedSdkVersions)
      .map(data => data.releaseNoteUrl)
      .filter(releaseNoteUrl => releaseNoteUrl)
      .reverse();
    if (releaseNotesUrls.length === 1) {
      Log.log(`You should also look at the breaking changes from a release that you skipped:`);
      Log.log(chalk.bold(`- ${releaseNotesUrls[0]}`));
    } else {
      Log.log(
        `In addition to the most recent release notes, you should go over the breaking changes from skipped releases:`
      );
      releaseNotesUrls.forEach(url => {
        Log.log(chalk.bold(`- ${url}`));
      });
    }
  }
}

async function maybeCleanNpmStateAsync(packageManager: any) {
  // We don't trust npm to properly handle deduping dependencies so we need to
  // clear the lockfile and node_modules.
  // https://forums.expo.io/t/sdk-37-unrecognized-font-family/35201
  // https://twitter.com/geoffreynyaga/status/1246170581109743617
  if (packageManager instanceof PackageManager.NpmPackageManager) {
    const cleaningNpmStateStep = logNewSection(
      'Removing package-lock.json and deleting node_modules.'
    );

    let shouldInstallNodeModules = true;
    try {
      await packageManager.removeLockfileAsync();
      await packageManager.cleanAsync();
      cleaningNpmStateStep.succeed('Removed package-lock.json and deleted node_modules.');
    } catch {
      shouldInstallNodeModules = false;
      cleaningNpmStateStep.fail(
        'Unable to remove package-lock.json and delete node_modules. We recommend doing this to ensure that the upgrade goes smoothly when using npm instead of yarn.'
      );
    }

    if (shouldInstallNodeModules) {
      const reinstallingNodeModulesStep = logNewSection(
        'Installing node_modules and rebuilding package-lock.json.'
      );

      try {
        await packageManager.installAsync();
        reinstallingNodeModulesStep.succeed(
          'Installed node_modules and rebuilt package-lock.json.'
        );
      } catch {
        reinstallingNodeModulesStep.fail(
          'Running npm install failed. Please check npm-error.log for more information.'
        );
      }
    }
  }
}

export default function (program: Command) {
  program
    .command('upgrade [sdk-version]')
    .alias('update')
    .description('Upgrade the project packages and config for the given SDK version')
    .helpGroup('info')
    .option('--npm', 'Use npm to install dependencies. (default when package-lock.json exists)')
    .option('--yarn', 'Use Yarn to install dependencies. (default when yarn.lock exists)')
    .asyncAction(async (requestedSdkVersion: string | null, options: Options) => {
      const { projectRoot, workflow } = await findProjectRootAsync(process.cwd());

      await upgradeAsync(
        {
          requestedSdkVersion,
          projectRoot,
          workflow,
        },
        options
      );
    });
}
