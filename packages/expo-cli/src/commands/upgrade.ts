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

type Options = {
  npm?: boolean;
  yarn?: boolean;
};

function maybeFormatSdkVersion(sdkVersionString: string | null) {
  if (!sdkVersionString) {
    return sdkVersionString;
  } else if (sdkVersionString.includes('.')) {
    return sdkVersionString;
  }

  return `${sdkVersionString}.0.0`;
}

type DependencyList = { [key: string]: string };

/**
 * Produce a list of dependencies used by the project that need to be updated
 */
async function getUpdatedDependenciesAsync(
  projectRoot: string,
  targetSdkVersion: { expoReactNativeTag: string; facebookReactVersion?: string } | null
): Promise<DependencyList> {
  let result: DependencyList = {};

  // Get the supported react-native version.
  // * We can't update the react-native version if the version data isn't published
  if (targetSdkVersion) {
    result['react-native'] = `https://github.com/expo/react-native/archive/${
      targetSdkVersion.expoReactNativeTag
    }.tar.gz`;

    // React version apparently is optional in SDK version data
    if (targetSdkVersion.facebookReactVersion) {
      result['react'] = targetSdkVersion.facebookReactVersion;
    }

    // - TODO: how do we know what version of react-native-web, react-dom to use?
    // - TODO: we need to track supported devDependencies versions somewhere programmatic too
  } else {
    console.log(`Supported React Native version unknown, please update it manually.`);
  }

  // Get the updated version for any bundled modules
  let { exp, pkg } = await ConfigUtils.readConfigJsonAsync(projectRoot);
  let bundledNativeModules = (await JsonFile.readAsync(
    ConfigUtils.resolveModule('expo/bundledNativeModules.json', projectRoot, exp)
  )) as DependencyList;

  let { dependencies } = pkg;
  Object.keys(bundledNativeModules).forEach(name => {
    if (dependencies[name]) {
      result[name] = bundledNativeModules[name];
    }
  });

  return result;
}

async function upgradeAsync(requestedSdkVersion: string | null, options: Options) {
  let { projectRoot, workflow } = await findProjectRootAsync(process.cwd());
  let { exp } = await ConfigUtils.readConfigJsonAsync(projectRoot);

  if (Versions.lteSdkVersion(exp, '32.0.0')) {
    log.error('The upgrade command is only available on SDK 33 and higher. Please refer to https://docs.expo.io/versions/latest/workflow/upgrading-expo-sdk-walkthrough/ for upgrade instructions.');
    return;
  }

  // Can't upgrade if we don't have a SDK version
  if (!exp.sdkVersion) {
    log.error('No sdkVersion field is present in app.json, cannot upgrade project.');
    return;
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
    console.log('This command is currently only supported on the managed workflow.');
    return;
  }

  // Bail out early if people are trying to update to the current version
  if (targetSdkVersionString === currentSdkVersionString) {
    console.log(
      'You are already using the latest SDK version. Follow https://blog.expo.io for new release information.'
    );
    return;
  }

  if (targetSdkVersionString === latestSdkVersionString) {
    let answer = await prompt({
      type: 'confirm',
      name: 'updateToLatestSdkVersion',
      message: `You are currently using SDK ${currentSdkVersionString}. Would you like to update to the latest version, ${
        latestSdkVersion.version
      }?`,
    });

    if (!answer.updateToLatestSdkVersion) {
      let sdkVersionStringOptions = Object.keys(sdkVersions).filter(
        v => !Versions.gteSdkVersion(exp, v)
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
  let updates = await getUpdatedDependenciesAsync(projectRoot, targetSdkVersion);
  let updatesAsStringArray = Object.keys(updates).map(name => `${name}@${updates[name]}`);
  await packageManager.addAsync(...updatesAsStringArray);

  log.addNewLineIfNone();
  log(chalk.underline.bold.green(`Automated upgrade steps complete.`));
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
    .option('--npm', 'Use npm to install dependencies. (default when package-lock.json exists)')
    .option('--yarn', 'Use Yarn to install dependencies. (default when yarn.lock exists)')
    .description('Upgrades your project dependencies and app.json and to the given SDK version')
    .asyncAction(upgradeAsync);
}
