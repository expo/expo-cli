import { Command } from 'commander';
import { Project, Versions } from '@expo/xdl';
import JsonFile from '@expo/json-file';
import * as ConfigUtils from '@expo/config';
import chalk from 'chalk';
import semver from 'semver';
import _ from 'lodash';

import * as PackageManager from '../PackageManager';
import CommandError from '../CommandError';
import prompt from '../prompt';
import log from '../log';
import { findProjectRootAsync, validateGitStatusAsync } from './utils/ProjectUtils';

type Options = {
  npm?: boolean;
  yarn?: boolean;
};

function maybeFormatSdkVersion(sdkVersionString: string | null) {
  if (typeof sdkVersionString !== 'string') {
    return sdkVersionString;
  }

  // semver.valid type doesn't accept null, so need to ensure we pass a string
  return semver.valid(semver.coerce(sdkVersionString) || '');
}

type DependencyList = { [key: string]: string };

/**
 * Produce a list of dependencies used by the project that need to be updated
 */
async function getUpdatedDependenciesAsync(
  projectRoot: string,
  workflow: 'managed' | 'bare',
  targetSdkVersion: {
    expoReactNativeTag: string;
    facebookReactVersion?: string;
    facebookReactNativeVersion: string;
    relatedPackages?: { [name: string]: string };
  } | null
): Promise<DependencyList> {
  let result: DependencyList = {};

  // Get the updated version for any bundled modules
  let { exp, pkg } = await ConfigUtils.readConfigJsonAsync(projectRoot);
  let bundledNativeModules = (await JsonFile.readAsync(
    ConfigUtils.resolveModule('expo/bundledNativeModules.json', projectRoot, exp)
  )) as DependencyList;

  // Smoosh regular and dev dependencies together for now
  let dependencies = { ...pkg.dependencies, ...pkg.devDependencies };

  Object.keys(bundledNativeModules).forEach(name => {
    if (dependencies[name]) {
      result[name] = bundledNativeModules[name];
    }
  });

  if (!targetSdkVersion) {
    log.warn(
      `Supported React, React Native, and React DOM versions are unknown because we don't have version information for the target SDK, please update them manually.`
    );
    return result;
  }

  if (dependencies['jest-expo']) {
    result['jest-expo'] = `^${exp.sdkVersion}`;
  }

  // Get the supported react/react-native/react-dom versions and other related packages
  if (workflow === 'managed' || dependencies['expokit']) {
    result['react-native'] = `https://github.com/expo/react-native/archive/${
      targetSdkVersion.expoReactNativeTag
    }.tar.gz`;
  } else {
    result['react-native'] = targetSdkVersion.facebookReactNativeVersion;
  }

  // React version apparently is optional in SDK version data
  if (targetSdkVersion.facebookReactVersion) {
    result['react'] = targetSdkVersion.facebookReactVersion;

    // react-dom version is always the same as the react version
    if (dependencies['react-dom']) {
      result['react-dom'] = targetSdkVersion.facebookReactVersion;
    }
  }

  // Update any related packages
  if (targetSdkVersion.relatedPackages) {
    Object.keys(targetSdkVersion.relatedPackages).forEach(name => {
      if (dependencies[name]) {
        result[name] = targetSdkVersion.relatedPackages![name];
      }
    });
  }

  return result;
}

async function upgradeAsync(requestedSdkVersion: string | null, options: Options) {
  let { projectRoot, workflow } = await findProjectRootAsync(process.cwd());
  let { exp, pkg } = await ConfigUtils.readConfigJsonAsync(projectRoot);
  let isGitStatusClean = await validateGitStatusAsync();
  log.newLine();

  // Give people a chance to bail out if git working tree is dirty
  if (!isGitStatusClean) {
    let answer = await prompt({
      type: 'confirm',
      name: 'ignoreDirtyGit',
      message: `Would you like to proceed?`,
    });

    if (!answer.ignoreDirtyGit) {
      return;
    }

    log.newLine();
  }

  // Give people a chance to bail out if they're updating from a super old version because YMMV
  if (!Versions.gteSdkVersion(exp, '33.0.0')) {
    let answer = await prompt({
      type: 'confirm',
      name: 'attemptOldUpdate',
      message: `This command works best on SDK 33 and higher. We can try updating for you, but you will likely need to follow up with the instructions from https://docs.expo.io/versions/latest/workflow/upgrading-expo-sdk-walkthrough/. Continue anyways?`,
    });

    if (!answer.attemptOldUpdate) {
      return;
    }

    log.newLine();
  }

  // Can't upgrade if we don't have a SDK version (tapping on head meme)
  if (!exp.sdkVersion) {
    if (workflow === 'bare') {
      log.error(
        'This command only works for bare workflow projects that also have the expo package installed and sdkVersion configured in app.json.'
      );
      throw new CommandError('SDK_VERSION_REQUIRED_FOR_UPGRADE_COMMAND_IN_BARE');
    } else {
      log.error('No sdkVersion field is present in app.json, cannot upgrade project.');
      throw new CommandError('SDK_VERSION_REQUIRED_FOR_UPGRADE_COMMAND_IN_MANAGED');
    }
  }

  // Can't upgrade if Expo is running
  let status = await Project.currentStatus(projectRoot);
  if (status === 'running') {
    await Project.stopAsync(projectRoot);
    log(
      chalk.bold.underline(
        'We found an existing expo-cli instance running for this project and closed it to continue.'
      )
    );
    log.addNewLineIfNone();
  }

  let currentSdkVersionString = exp.sdkVersion;
  let sdkVersions = await Versions.sdkVersionsAsync();
  let latestSdkVersion = await Versions.newestSdkVersionAsync();
  let latestSdkVersionString = latestSdkVersion.version;
  let targetSdkVersionString =
    maybeFormatSdkVersion(requestedSdkVersion) || latestSdkVersion.version;
  let targetSdkVersion = sdkVersions[targetSdkVersionString];

  // Maybe bail out early if people are trying to update to the current version
  if (targetSdkVersionString === currentSdkVersionString) {
    let answer = await prompt({
      type: 'confirm',
      name: 'attemptUpdateAgain',
      message: `You are already using the latest SDK version. Do you want to run the update anyways? This may be useful to ensure that all of your packages are set to the correct version.`,
    });

    if (!answer.attemptUpdateAgain) {
      log('Follow the Expo blog at https://blog.expo.io for new release information!');
      return;
    }
  }

  if (
    targetSdkVersionString === latestSdkVersionString &&
    currentSdkVersionString !== targetSdkVersionString
  ) {
    let answer = await prompt({
      type: 'confirm',
      name: 'updateToLatestSdkVersion',
      message: `You are currently using SDK ${currentSdkVersionString}. Would you like to update to the latest version, ${
        latestSdkVersion.version
      }?`,
    });

    log.newLine();

    if (!answer.updateToLatestSdkVersion) {
      let sdkVersionStringOptions = Object.keys(sdkVersions).filter(
        v => !Versions.gteSdkVersion(exp, v) && semver.gte('33.0.0', v)
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

  let packageManager = PackageManager.createForProject(projectRoot, {
    npm: options.npm,
    yarn: options.yarn,
  });

  log.addNewLineIfNone();
  log(chalk.underline.bold('Installing the expo package...'));
  log.addNewLineIfNone();
  await packageManager.addAsync(`expo@^${targetSdkVersionString}`);

  log.addNewLineIfNone();
  log(chalk.underline.bold('Updating sdkVersion in app.json...'));
  await ConfigUtils.writeConfigJsonAsync(projectRoot, { sdkVersion: targetSdkVersionString });

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
      .filter(releaseNotesUrl => releaseNotesUrl)
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
    .asyncAction(upgradeAsync);
}
