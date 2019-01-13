// @flow

import chalk from 'chalk';
import fse from 'fs-extra';
import matchRequire from 'match-require';
import path from 'path';
import semver from 'semver';
import spawn from 'cross-spawn';
import spawnAsync from '@expo/spawn-async';
import { ProjectUtils, Detach, Versions } from 'xdl';
import log from '../../log';

import prompt from '../../prompt';
import { loginOrRegisterIfLoggedOut } from '../../accounts';

export async function ejectAsync(projectRoot: string, options) {
  let workingTreeStatus = 'unknown';
  try {
    let result = await spawnAsync('git', ['status', '--porcelain']);
    workingTreeStatus = result.stdout === '' ? 'clean' : 'dirty';
  } catch (e) {
    // Maybe git is not installed?
    // Maybe this project is not using git?
  }

  if (workingTreeStatus === 'clean') {
    log.nested(`Your git working tree is ${chalk.green('clean')}`);
    log.nested('To revert the changes from ejecting later, you can use these commands:');
    log.nested('  git clean --force && git reset --hard');
  } else if (workingTreeStatus === 'dirty') {
    log.nested(`${chalk.bold('Warning!')} Your git working tree is ${chalk.red('dirty')}.`);
    log.nested(
      `It's recommended to ${chalk.bold(
        'commit all your changes before proceeding'
      )},\nso you can revert the changes made by this command if necessary.`
    );
  } else {
    log.nested("We couldn't find a git repository in your project directory.");
    log.nested("It's recommended to back up your project before proceeding.");
  }

  log.nested('');

  const questions = [
    {
      type: 'list',
      name: 'ejectMethod',
      message:
        'How would you like to eject your app?\n  Read more: https://docs.expo.io/versions/latest/expokit/eject/',
      default: 'plain',
      choices: [
        {
          name: "React Native: I'd like a React Native project with universal modules.",
          value: 'plain',
          short: 'React Native',
        },
        {
          name:
            "ExpoKit: I'll create or log in with an Expo account to use React Native and the Expo SDK. (experimental 🚧)",
          value: 'expokit',
          short: 'ExpoKit',
        },
        {
          name: "Cancel: I'll continue with my current project structure.",
          value: 'cancel',
          short: 'cancel',
        },
      ],
    },
  ];

  const ejectMethod =
    options.ejectMethod ||
    (await prompt(questions, {
      nonInteractiveHelp:
        'Please specify eject method (expokit, plain) with --eject-method option.',
    })).ejectMethod;

  if (ejectMethod === 'plain') {
    await ejectToReactNativeAsync(projectRoot);
  } else if (ejectMethod === 'expokit') {
    await loginOrRegisterIfLoggedOut();
    await Detach.detachAsync(projectRoot, options);
  } else if (ejectMethod === 'cancel') {
    // we don't want to print the survey for cancellations
    log('OK! If you change your mind you can run this command again.');
    return;
  } else {
    throw new Error(
      `Unrecognized eject method "${ejectMethod}". Valid options are: expokit, plain.`
    );
  }

  log(chalk.green('Ejected successfully!'));
}

async function ejectToReactNativeAsync(projectRoot: string, options: Object) {
  const { configPath, configName } = await ProjectUtils.findConfigFileAsync(projectRoot);
  const { exp, pkg: pkgJson } = await ProjectUtils.readConfigJsonAsync(projectRoot);
  const appJson = configName === 'app.json' ? JSON.parse(await fse.readFile(configPath)) : {};
  if (!exp) throw new Error(`Couldn't read ${configName}`);
  if (!pkgJson) throw new Error(`Couldn't read package.json`);

  const versions = await Versions.versionsAsync();
  const version = versions.sdkVersions[exp.sdkVersion];
  if (!version) {
    throw new Error(`SDK version (${exp.sdkVersion}) not found.`);
  }
  if (!version.facebookReactNativeVersion || !semver.valid(version.facebookReactNativeVersion)) {
    throw new Error(
      `React Native version for SDK version (${exp.sdkVersion}) is not valid: ${
        version.facebookReactNativeVersion
      }`
    );
  }

  let { displayName, name } = appJson;
  if (!displayName || !name) {
    log("We have a couple of questions to ask you about how you'd like to name your app:");
    ({ displayName, name } = await prompt(
      [
        {
          name: 'displayName',
          message: "What should your app appear as on a user's home screen?",
          default: exp.name || name,
          validate: s => {
            return s.length > 0;
          },
        },
        {
          name: 'name',
          message: 'What should your Android Studio and Xcode projects be called?',
          default: pkgJson.name ? stripDashes(pkgJson.name) : undefined,
          validate: s => {
            return s.length > 0 && s.indexOf('-') === -1 && s.indexOf(' ') === -1;
          },
        },
      ],
      {
        nonInteractiveHelp: 'Please specify "displayName" and "name" in app.json.',
      }
    ));
    appJson.displayName = displayName;
    appJson.name = name;
  }
  delete appJson.expo;
  log('Writing app.json...');
  // write the updated app.json file
  await fse.writeFile(path.resolve(projectRoot, 'app.json'), JSON.stringify(appJson, null, 2));
  const ejectCommand = 'node';
  const ejectArgs = [
    ProjectUtils.resolveModule('react-native/local-cli/cli.js', projectRoot, exp),
    'eject',
  ];

  try {
    await spawnAsync('node', ejectArgs, { stdio: 'inherit' });
  } catch (error) {
    log.error(`Eject failed with exit code ${status}, see above output for any issues.`);
    throw error;
  }
  log('Successfully copied template native code.');

  const newDevDependencies = [];

  // Replace the Expo version of React Native.

  // Try to replace the Babel preset.
  try {
    const projectBabelPath = path.resolve(projectRoot, '.babelrc');
    // If .babelrc doesn't exist, the app is using the default config and
    // editing the config is not necessary.
    if (await fse.exists(projectBabelPath)) {
      const projectBabelRc = (await fse.readFile(projectBabelPath)).toString();

      // We assume the .babelrc is valid JSON. If we can't parse it (e.g. if
      // it's JSON5) the error is caught and a message asking to change it
      // manually gets printed.
      const babelRcJson = JSON.parse(projectBabelRc);
      if (babelRcJson.presets && babelRcJson.presets.includes('babel-preset-expo')) {
        babelRcJson.presets = babelRcJson.presets.map(preset =>
          preset === 'babel-preset-expo'
            ? 'babel-preset-react-native-stage-0/decorator-support'
            : preset
        );
        await fse.writeFile(projectBabelPath, JSON.stringify(babelRcJson, null, 2));
        newDevDependencies.push('babel-preset-react-native-stage-0');
        log(
          chalk.green(
            `Babel preset changed to \`babel-preset-react-native-stage-0/decorator-support\`.`
          )
        );
      }
    }
  } catch (e) {
    log.warn(`We had an issue preparing your .babelrc for ejection.
If you have a .babelrc file in your project, make sure to change the preset
from \`babel-preset-expo\` to \`babel-preset-react-native-stage-0/decorator-support\`.`);
    log.error(e);
  }

  delete pkgJson.main;

  // Switch to the main releases of React Native from the Expo fork.
  pkgJson.dependencies['react-native'] = version.facebookReactNativeVersion;
  pkgJson.dependencies['react'] = version.facebookReactVersion;
  if (semver.eq(version.facebookReactNativeVersion, '0.57.1')) {
    pkgJson.dependencies['@babel/runtime'] = '^7.0.0'; // Fix for https://github.com/facebook/react-native/issues/21310
  }

  // NOTE: expo won't work after performing a plain eject, so we should delete this
  // it will be a better error message for the module to not be found than for whatever problems
  // missing native modules will cause
  delete pkgJson.dependencies['expo'];
  if (!pkgJson.devDependencies) {
    pkgJson.devDependencies = {};
  }
  if (pkgJson.devDependencies['jest-expo']) {
    delete pkgJson.devDependencies['jest-expo'];

    const jestDeps = `jest babel-jest metro-react-native-babel-preset react-test-renderer@${
      version.facebookReactVersion
    }`;
    if (yarnVersion) {
      console.log('Adding Jest...');
      execSync(`yarn add ${jestDeps} --dev --exact`, { stdio: 'inherit' });
    } else {
      console.log('Installing Jest...');
      execSync(`npm install ${jestDeps} --save-dev --save-exact`, {
        stdio: 'inherit',
      });
    }
  }

  if (!pkgJson.scripts) {
    pkgJson.scripts = {};
  }
  pkgJson.scripts.start = 'react-native start';
  pkgJson.scripts.ios = 'react-native run-ios';
  pkgJson.scripts.android = 'react-native run-android';

  if (pkgJson.jest !== undefined) {
    newDevDependencies.push('jest');

    if (pkgJson.jest.preset === 'jest-expo') {
      pkgJson.jest.preset = 'react-native';
    } else {
      log(
        `${chalk.bold('Warning')}: it looks like you've changed the Jest preset from jest-expo to ${
          pkgJson.jest.preset
        }. We recommend you make sure this Jest preset is compatible with ejected apps.`
      );
    }
  }

  // no longer relevant to an ejected project (maybe build is?)
  delete pkgJson.scripts.eject;

  log(`Updating the scripts in package.json...`);

  await fse.writeFile(path.resolve(projectRoot, 'package.json'), JSON.stringify(pkgJson, null, 2));

  log(chalk.green('Your package.json is up to date!'));

  const useYarn = await fse.exists(path.resolve(projectRoot, 'yarn.lock'));
  const npmOrYarn = useYarn ? 'yarn' : 'npm';

  log(`
Note that using \`${npmOrYarn} start\` will now require you to run Xcode and/or
Android Studio to build the native code for your project.`);

  log('Removing node_modules...');
  await fse.remove('node_modules');
  if (useYarn) {
    log('Installing packages with yarn...');
    const args = newDevDependencies.length > 0 ? ['add', '--dev', ...newDevDependencies] : [];
    spawn.sync('yarnpkg', args, { stdio: 'inherit' });
  } else {
    // npm prints the whole package tree to stdout unless we ignore it.
    const stdio = [process.stdin, 'ignore', process.stderr];

    log('Installing existing packages with npm...');
    spawn.sync('npm', ['install'], { stdio });

    if (newDevDependencies.length > 0) {
      log('Installing new packages with npm...');
      spawn.sync('npm', ['install', '--save-dev', ...newDevDependencies], {
        stdio,
      });
    }
  }
}

function stripDashes(s: string): string {
  let ret = '';

  for (let c of s) {
    if (c !== ' ' && c !== '-') {
      ret += c;
    }
  }

  return ret;
}
