import { Command } from 'commander';
import { Versions } from '@expo/xdl';
import JsonFile from '@expo/json-file';
import * as ConfigUtils from '@expo/config';
import chalk from 'chalk';
import * as PackageManager from '../PackageManager';
import CommandError from '../CommandError';
import prompt from '../prompt';
import log from '../log';
import path from 'path';
import fs from 'fs';
import semver from 'semver';
import _ from 'lodash';

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
  targetSdkVersion: {
    expoReactNativeTag: string;
    facebookReactVersion?: string;
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
  result['react-native'] = `https://github.com/expo/react-native/archive/${
    targetSdkVersion.expoReactNativeTag
  }.tar.gz`;

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

  if (!Versions.gteSdkVersion(exp, '33.0.0')) {
    let answer = await prompt({
      type: 'confirm',
      name: 'attemptOldUpdate',
      message: `This command works best on SDK 33 and higher. We can try updating for you, but you will likely need to follow up with the instructions from https://docs.expo.io/versions/latest/workflow/upgrading-expo-sdk-walkthrough/. Continue anyways?`,
    });

    if (!answer.attemptOldUpdate) {
      return;
    }
  }

  // Can't upgrade if we don't have a SDK version
  if (!exp.sdkVersion) {
    log.error('No sdkVersion field is present in app.json, cannot upgrade project.');
    throw new CommandError('SDK_VERSION_REQUIRED_FOR_UPGRADE_COMMAND');
  }

  let currentSdkVersionString = exp.sdkVersion;
  let sdkVersions = await Versions.sdkVersionsAsync();
  let latestSdkVersion = await Versions.newestSdkVersionAsync();
  let latestSdkVersionString = latestSdkVersion.version;
  let targetSdkVersionString =
    maybeFormatSdkVersion(requestedSdkVersion) || latestSdkVersion.version;
  let targetSdkVersion = sdkVersions[targetSdkVersionString];

  // TODO: figure out how this should work for bare workflow
  if (workflow === 'bare') {
    log.warn('This command is currently only supported on the managed workflow.');
    throw new CommandError('UPGRADE_UNSUPPORTED_WITH_BARE_WORKFLOW');
  }

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
  let updates = await getUpdatedDependenciesAsync(projectRoot, targetSdkVersion);

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

  log.addNewLineIfNone();
  log(chalk.underline.bold.green(`Automated upgrade steps complete.`));

  // TODO: List packages that were updated
  // TODO: List packages that were not updated

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

  // TODO: If we updated multiple SDK versions, log the link to release notes for each of those versions

  log.addNewLineIfNone();
}

// TODO: extract to another helper and update in install.js too
async function findProjectRootAsync(base: string) {
  let previous = null;
  let dir = base;

  do {
    if (await JsonFile.getAsync(path.join(dir, 'app.json'), 'expo', null)) {
      return { projectRoot: dir, workflow: 'managed' };
    } else if (fs.existsSync(path.join(dir, 'package.json'))) {
      return { projectRoot: dir, workflow: 'bare' };
    }
    previous = dir;
    dir = path.dirname(dir);
  } while (dir !== previous);

  throw new CommandError(
    'NO_PROJECT',
    'No managed or bare projects found. Please make sure you are inside a project folder.'
  );
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
