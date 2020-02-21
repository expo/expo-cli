import * as ConfigUtils from '@expo/config';
import JsonFile from '@expo/json-file';
import * as PackageManager from '@expo/package-manager';
import { Android, Project, Simulator, Versions } from '@expo/xdl';
import chalk from 'chalk';
import program, { Command } from 'commander';
import _ from 'lodash';
import semver from 'semver';

import log from '../log';
import prompt from '../prompt';
import { findProjectRootAsync, validateGitStatusAsync } from './utils/ProjectUtils';

type DependencyList = Record<string, string>;

type Options = {
  npm?: boolean;
  yarn?: boolean;
};

export type ExpoWorkflow = 'managed' | 'bare';

export type TargetSDKVersion = Pick<
  Versions.SDKVersion,
  'expoReactNativeTag' | 'facebookReactVersion' | 'facebookReactNativeVersion' | 'relatedPackages'
>;

export function maybeFormatSdkVersion(sdkVersionString: string | null): string | null {
  if (typeof sdkVersionString !== 'string' || sdkVersionString === 'UNVERSIONED') {
    return sdkVersionString;
  }

  // semver.valid type doesn't accept null, so need to ensure we pass a string
  return semver.valid(semver.coerce(sdkVersionString) || '');
}

/**
 * Produce a list of dependencies used by the project that need to be updated
 */
export async function getUpdatedDependenciesAsync(
  projectRoot: string,
  workflow: ExpoWorkflow,
  targetSdkVersion: TargetSDKVersion | null
): Promise<DependencyList> {
  // Get the updated version for any bundled modules
  const { exp, pkg } = ConfigUtils.getConfig(projectRoot, { mode: 'development' });
  const bundledNativeModules = (await JsonFile.readAsync(
    ConfigUtils.resolveModule('expo/bundledNativeModules.json', projectRoot, exp)
  )) as DependencyList;

  // Smoosh regular and dev dependencies together for now
  const projectDependencies = { ...pkg.dependencies, ...pkg.devDependencies };

  return getDependenciesFromBundledNativeModules({
    projectDependencies,
    bundledNativeModules,
    sdkVersion: exp.sdkVersion,
    workflow,
    targetSdkVersion,
  });
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
    result['jest-expo'] = `^${sdkVersion}`;
  }

  if (!targetSdkVersion) {
    log.warn(
      `Supported React, React Native, and React DOM versions are unknown because we don't have version information for the target SDK, please update them manually.`
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

async function maybeBailOnGitStatusAsync(): Promise<boolean> {
  const isGitStatusClean = await validateGitStatusAsync();
  log.newLine();

  // Give people a chance to bail out if git working tree is dirty
  if (!isGitStatusClean) {
    if (program.nonInteractive) {
      log.warn(
        `Git status is dirty but the command will continue because nonInteractive is enabled.`
      );
      return false;
    }

    const answer = await prompt({
      type: 'confirm',
      name: 'ignoreDirtyGit',
      message: `Would you like to proceed?`,
    });

    if (!answer.ignoreDirtyGit) {
      return true;
    }

    log.newLine();
  }
  return false;
}

async function maybeBailOnUnsafeFunctionalityAsync(
  exp: Pick<ConfigUtils.ExpoConfig, 'sdkVersion'>
): Promise<boolean> {
  // Give people a chance to bail out if they're updating from a super old version because YMMV
  if (!Versions.gteSdkVersion(exp, '33.0.0')) {
    if (program.nonInteractive) {
      log.warn(
        `This command works best on SDK 33 and higher. Because the command is running in nonInteractive mode it'll continue regardless.`
      );
      return true;
    }

    const answer = await prompt({
      type: 'confirm',
      name: 'attemptOldUpdate',
      message: `This command works best on SDK 33 and higher. We can try updating for you, but you will likely need to follow up with the instructions from https://docs.expo.io/versions/latest/workflow/upgrading-expo-sdk-walkthrough/. Continue anyways?`,
    });

    if (!answer.attemptOldUpdate) {
      return true;
    }

    log.newLine();
  }
  return false;
}

async function stopExpoServerAsync(projectRoot: string): Promise<void> {
  // Can't upgrade if Expo is running
  const status = await Project.currentStatus(projectRoot);
  if (status === 'running') {
    await Project.stopAsync(projectRoot);
    log(
      chalk.bold.underline(
        'We found an existing expo-cli instance running for this project and closed it to continue.'
      )
    );
    log.addNewLineIfNone();
  }
}

async function shouldBailWhenUsingLatest(
  currentSdkVersionString: string,
  targetSdkVersionString: string
): Promise<boolean> {
  // Maybe bail out early if people are trying to update to the current version
  if (targetSdkVersionString === currentSdkVersionString) {
    if (program.nonInteractive) {
      log.warn(
        `You are already using the latest SDK version but the command will continue because nonInteractive is enabled.`
      );
      return false;
    }
    const answer = await prompt({
      type: 'confirm',
      name: 'attemptUpdateAgain',
      message: `You are already using the latest SDK version. Do you want to run the update anyways? This may be useful to ensure that all of your packages are set to the correct version.`,
    });

    if (!answer.attemptUpdateAgain) {
      log('Follow the Expo blog at https://blog.expo.io for new release information!');
      return true;
    }
  }
  return false;
}

async function shouldUpgradeSimulatorAsync(): Promise<boolean> {
  // Check if we can, and probably should, upgrade the (ios) simulator
  if (Simulator.isPlatformSupported()) {
    if (program.nonInteractive) {
      log.warn(`Skipping attempt to upgrade the client app on iOS simulator.`);
      return false;
    }

    let answer = await prompt({
      type: 'confirm',
      name: 'upgradeSimulator',
      message:
        'You might have to upgrade your iOS simulator. Before you can do that, you have to run the simulator. Do you want to upgrade it now?',
      default: false,
    });

    return answer.upgradeSimulator;
  }
  return false;
}

async function maybeUpgradeSimulatorAsync() {
  // Check if we can, and probably should, upgrade the (ios) simulator
  if (Simulator.isPlatformSupported()) {
    if (await shouldUpgradeSimulatorAsync()) {
      let result = await Simulator.upgradeExpoAsync();
      if (!result) {
        log.error(
          "The upgrade of your simulator didn't go as planned. You might have to reinstall it manually with expo client:install:ios."
        );
      }
    }
    log.newLine();
  }
}

async function shouldUpgradeEmulatorAsync(): Promise<boolean> {
  // Check if we can, and probably should, upgrade the android client
  if (Android.isPlatformSupported()) {
    if (program.nonInteractive) {
      log.warn(`Skipping attempt to upgrade the client app on the Android emulator.`);
      return false;
    }

    const answer = await prompt({
      type: 'confirm',
      name: 'upgradeAndroid',
      message:
        'You might have to upgrade your Android client. Before you can do that, you have to run the emulator, or plug a device in. Do you want to upgrade it now?',
      default: false,
    });

    return answer.upgradeAndroid;
  }
  return false;
}

async function maybeUpgradeEmulatorAsync() {
  // Check if we can, and probably should, upgrade the android client
  if (await shouldUpgradeEmulatorAsync()) {
    const result = await Android.upgradeExpoAsync();
    if (!result) {
      log.error(
        "The upgrade of your Android client didn't go as planned. You might have to reinstall it manually with expo client:install:android."
      );
    }
    log.newLine();
  }
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
  let { exp, pkg } = await ConfigUtils.getConfig(projectRoot, {
    skipSDKVersionRequirement: false,
    mode: 'development',
  });

  if (await maybeBailOnGitStatusAsync()) return;

  if (await maybeBailOnUnsafeFunctionalityAsync(exp)) return;

  await stopExpoServerAsync(projectRoot);

  let currentSdkVersionString = exp.sdkVersion!;
  let sdkVersions = await Versions.releasedSdkVersionsAsync();
  let latestSdkVersion = await Versions.newestReleasedSdkVersionAsync();
  let latestSdkVersionString = latestSdkVersion.version;
  let targetSdkVersionString =
    maybeFormatSdkVersion(requestedSdkVersion) || latestSdkVersion.version;
  let targetSdkVersion = sdkVersions[targetSdkVersionString];

  // Maybe bail out early if people are trying to update to the current version
  if (await shouldBailWhenUsingLatest(currentSdkVersionString, targetSdkVersionString)) return;

  if (
    targetSdkVersionString === latestSdkVersionString &&
    currentSdkVersionString !== targetSdkVersionString &&
    !program.nonInteractive
  ) {
    let answer = await prompt({
      type: 'confirm',
      name: 'updateToLatestSdkVersion',
      message: `You are currently using SDK ${currentSdkVersionString}. Would you like to update to the latest version, ${latestSdkVersion.version}?`,
    });

    log.newLine();

    if (!answer.updateToLatestSdkVersion) {
      let sdkVersionStringOptions = Object.keys(sdkVersions).filter(
        v => semver.lte('33.0.0', v) && !Versions.gteSdkVersion(exp, v)
      );

      let { selectedSdkVersionString } = await prompt({
        type: 'list',
        name: 'selectedSdkVersionString',
        message: 'Choose a SDK version to upgrade to:',
        pageSize: 20,
        choices: sdkVersionStringOptions.map(sdkVersionString => ({
          value: sdkVersionString,
          name: chalk.bold(sdkVersionString),
        })),
      });

      // This has to exist because it's based on keys already present in sdkVersions
      targetSdkVersion = sdkVersions[selectedSdkVersionString];
      targetSdkVersionString = selectedSdkVersionString;
      log.newLine();
    }
  } else if (!targetSdkVersion) {
    if (program.nonInteractive) {
      log.warn(
        `You provided the target SDK version value of ${targetSdkVersionString} which does not seem to exist. Upgrading anyways because the command is running in nonInteractive mode.`
      );
    } else {
      // If they provide an apparently unsupported sdk version then let people try
      // anyways, maybe we want to use this for testing alpha versions or
      // something...
      let answer = await prompt({
        type: 'confirm',
        name: 'attemptUnknownUpdate',
        message: `You provided the target SDK version value of ${targetSdkVersionString} which does not seem to exist. But hey, I'm just a program, what do I know. Do you want to try to upgrade to it anyways?`,
      });

      if (!answer.attemptUnknownUpdate) {
        return;
      }
    }
  }

  const platforms = exp.platforms || [];

  // Check if we can, and probably should, upgrade the (ios) simulator
  if (platforms.includes('ios')) {
    await maybeUpgradeSimulatorAsync();
  }

  // Check if we can, and probably should, upgrade the android client
  if (platforms.includes('android')) {
    await maybeUpgradeEmulatorAsync();
  }

  let packageManager = PackageManager.createForProject(projectRoot, {
    npm: options.npm,
    yarn: options.yarn,
    log,
  });

  log.addNewLineIfNone();
  log(chalk.underline.bold('Installing the expo package...'));
  log.addNewLineIfNone();
  await packageManager.addAsync(`expo@^${targetSdkVersionString}`);

  // Remove sdkVersion from app.json
  try {
    const { rootConfig } = await ConfigUtils.readConfigJsonAsync(projectRoot);
    if (rootConfig.expo.sdkVersion && rootConfig.expo.sdkVersion !== 'UNVERSIONED') {
      log.addNewLineIfNone();
      log(chalk.underline.bold('Removing deprecated sdkVersion property from the app.json...'));
      await ConfigUtils.writeConfigJsonAsync(projectRoot, { sdkVersion: undefined });
    }
  } catch (_) {}

  // Evaluate project config (app.config.js)
  const { exp: currentExp } = ConfigUtils.getConfig(projectRoot, { mode: 'development' });

  if (
    !Versions.gteSdkVersion(currentExp, targetSdkVersionString) &&
    currentExp.sdkVersion !== 'UNVERSIONED'
  ) {
    log.addNewLineIfNone();
    log(
      chalk.underline.bold("Please manually delete the sdkVersion in your project's app.config...")
    );
  }

  log(chalk.bold.underline('Updating packages to compatible versions (where known)...'));
  log.addNewLineIfNone();

  // Get all updated packages
  let updates = await getUpdatedDependenciesAsync(projectRoot, workflow, targetSdkVersion);

  // Split updated packages by dependencies and devDependencies
  let devDependencies = _.pickBy(updates, (_version, name) => _.has(pkg.devDependencies, name));
  let devDependenciesAsStringArray = Object.keys(devDependencies).map(
    name => `${name}@${updates[name]}`
  );
  let dependencies = _.pickBy(updates, (_version, name) => _.has(pkg.dependencies, name));
  let dependenciesAsStringArray = Object.keys(dependencies).map(name => `${name}@${updates[name]}`);

  // Install dev dependencies
  if (devDependenciesAsStringArray.length) {
    await packageManager.addDevAsync(...devDependenciesAsStringArray);
  }

  // Install dependencies
  if (dependenciesAsStringArray.length) {
    await packageManager.addAsync(...dependenciesAsStringArray);
  }

  // Clear metro bundler cache
  log.addNewLineIfNone();
  log(chalk.bold.underline('Clearing the packager cache...'));
  await Project.startReactNativeServerAsync(projectRoot, { reset: true, nonPersistent: true });
  await Project.stopReactNativeServerAsync(projectRoot);

  log.addNewLineIfNone();
  log(chalk.underline.bold.green(`Automated upgrade steps complete.`));
  log(chalk.bold.grey(`...but this doesn't mean everything is done yet!`));
  log.newLine();

  // List packages that were updated
  log(chalk.bold(`The following packages were updated:`));
  log(chalk.grey.bold([...Object.keys(updates), ...['expo']].join(', ')));
  log.addNewLineIfNone();

  // List packages that were not updated
  let allDependencies = { ...pkg.dependencies, ...pkg.devDependencies };
  let untouchedDependencies = _.difference(Object.keys(allDependencies), [
    ...Object.keys(updates),
    'expo',
  ]);
  if (untouchedDependencies.length) {
    log.addNewLineIfNone();
    log(
      chalk.bold(
        `The following packages were ${chalk.underline(
          'not'
        )} updated. You should check the READMEs for those repositories to determine what version is compatible with your new set of packages:`
      )
    );
    log(chalk.grey.bold(untouchedDependencies.join(', ')));
    log.addNewLineIfNone();
  }

  // Add some basic additional instructions for bare workflow
  if (workflow === 'bare') {
    log.addNewLineIfNone();
    log(
      chalk.bold(
        `It will be necessary to re-build your native projects to compile the updated dependencies. You will need to run ${chalk.grey(
          'pod install'
        )} in your ios directory before re-building the iOS project.`
      )
    );
    log.addNewLineIfNone();
  }

  if (targetSdkVersion && targetSdkVersion.releaseNoteUrl) {
    log(
      `Please refer to the release notes for information on any further required steps to update and information about breaking changes:`
    );
    log(chalk.bold(targetSdkVersion.releaseNoteUrl));
  } else {
    log.gray(
      `Unable to find release notes for ${targetSdkVersionString}, please try to find them on https://blog.expo.io to learn more about other potentially important upgrade steps and breaking changes.`
    );
  }

  let skippedSdkVersions = _.pickBy(sdkVersions, (_data, sdkVersionString) => {
    return (
      semver.lt(sdkVersionString, targetSdkVersionString) &&
      semver.gt(sdkVersionString, currentSdkVersionString)
    );
  });

  let skippedSdkVersionKeys = Object.keys(skippedSdkVersions);
  if (skippedSdkVersionKeys.length) {
    log.newLine();

    let releaseNotesUrls = Object.values(skippedSdkVersions)
      .map(data => data.releaseNoteUrl)
      .filter(releaseNoteUrl => releaseNoteUrl)
      .reverse();
    if (releaseNotesUrls.length === 1) {
      log(`You should also look at the breaking changes from a release that you skipped:`);
      log(chalk.bold(`- ${releaseNotesUrls[0]}`));
    } else {
      log(
        `In addition to the most recent release notes, you should go over the breaking changes from skipped releases:`
      );
      releaseNotesUrls.forEach(url => {
        log(chalk.bold(`- ${url}`));
      });
    }
  }

  log.addNewLineIfNone();
}

export default function(program: Command) {
  program
    .command('upgrade [targetSdkVersion]')
    .alias('update')
    .option('--npm', 'Use npm to install dependencies. (default when package-lock.json exists)')
    .option('--yarn', 'Use Yarn to install dependencies. (default when yarn.lock exists)')
    .description('Upgrades your project dependencies and app.json and to the given SDK version')
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
