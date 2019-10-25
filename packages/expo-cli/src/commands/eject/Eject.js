// @flow

import chalk from 'chalk';
import fse from 'fs-extra';
import npmPackageArg from 'npm-package-arg';
import path from 'path';
import semver from 'semver';
import pacote from 'pacote';
import temporary from 'tempy';
import JsonFile from '@expo/json-file';
import { Exp, ProjectUtils, Detach, Versions } from '@expo/xdl';
import * as ConfigUtils from '@expo/config';
import * as PackageManager from '../../PackageManager';
import { validateGitStatusAsync } from '../utils/ProjectUtils';

import log from '../../log';
import prompt from '../../prompt';
import { loginOrRegisterIfLoggedOut } from '../../accounts';

const EXPO_APP_ENTRY = 'node_modules/expo/AppEntry.js';

async function warnIfDependenciesRequireAdditionalSetupAsync(projectRoot: string) {
  const { exp, pkg: pkgJson } = await ProjectUtils.readConfigJsonAsync(projectRoot);
  const pkgsWithExtraSetup = await JsonFile.readAsync(
    ConfigUtils.resolveModule('expo/requiresExtraSetup.json', projectRoot, exp)
  );
  const packagesToWarn = Object.keys(pkgJson.dependencies).filter(pkgName =>
    pkgsWithExtraSetup.hasOwnProperty(pkgName)
  );

  if (packagesToWarn.length === 0) {
    return;
  }

  let plural = packagesToWarn.length > 1;
  log.nested('');
  log.nested(
    chalk.yellow(
      `Warning: your app includes ${chalk.bold(packagesToWarn.length)} package${
        plural ? 's' : ''
      } that require${plural ? '' : 's'} additional setup. See the following URL${
        plural ? 's' : ''
      } for instructions.`
    )
  );
  log.nested(
    chalk.yellow(
      `Your app may not build/run until the additional setup for ${
        plural ? 'these packages' : 'this package'
      } has been completed.`
    )
  );
  log.nested('');
  packagesToWarn.forEach(pkgName => {
    log.nested(chalk.yellow(`- ${chalk.bold(pkgName)}: ${pkgsWithExtraSetup[pkgName]}`));
  });
  log.nested('');
}

export async function ejectAsync(projectRoot: string, options) {
  await validateGitStatusAsync();
  log.nested('');

  let reactNativeOptionMessage = "Bare: I'd like a bare React Native project.";

  const questions = [
    {
      type: 'list',
      name: 'ejectMethod',
      message:
        'How would you like to eject your app?\n  Read more: https://docs.expo.io/versions/latest/expokit/eject/',
      default: 'bare',
      choices: [
        {
          name: reactNativeOptionMessage,
          value: 'bare',
          short: 'Bare',
        },
        {
          name:
            "ExpoKit: I'll create or log in with an Expo account to use React Native and the Expo SDK.",
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
        'Please specify eject method (bare, expokit) with the --eject-method option.',
    })).ejectMethod;

  if (ejectMethod === 'bare') {
    await ejectToBareAsync(projectRoot, options);
    log.nested(chalk.green('Ejected successfully!'));
    log.newLine();
    log.nested(
      `Before running your app on iOS, make sure you have CocoaPods installed and initialize the project:`
    );
    log.nested('');
    log.nested(`  cd ios`);
    log.nested(`  pod install`);
    log.nested('');
    log.nested('Then you can run the project:');
    log.nested('');
    let packageManager = ConfigUtils.isUsingYarn(projectRoot) ? 'yarn' : 'npm';
    log.nested(`  ${packageManager === 'npm' ? 'npm run android' : 'yarn android'}`);
    log.nested(`  ${packageManager === 'npm' ? 'npm run ios' : 'yarn ios'}`);
    await warnIfDependenciesRequireAdditionalSetupAsync(projectRoot);
  } else if (ejectMethod === 'expokit') {
    await loginOrRegisterIfLoggedOut();
    await Detach.detachAsync(projectRoot, options);
    log(chalk.green('Ejected successfully!'));
  } else if (ejectMethod === 'cancel') {
    // we don't want to print the survey for cancellations
    log('OK! If you change your mind you can run this command again.');
  } else {
    throw new Error(
      `Unrecognized eject method "${ejectMethod}". Valid options are: bare, expokit.`
    );
  }
}

async function ejectToBareAsync(projectRoot, options) {
  const useYarn = ConfigUtils.isUsingYarn(projectRoot);
  const npmOrYarn = useYarn ? 'yarn' : 'npm';
  const { configPath, configName } = await ConfigUtils.findConfigFileAsync(projectRoot);
  const { exp, pkg: pkgJson } = await ProjectUtils.readConfigJsonAsync(projectRoot);
  const appJson = configName === 'app.json' ? JSON.parse(await fse.readFile(configPath)) : {};

  /**
   * Perform validations
   */
  if (!exp) throw new Error(`Couldn't read ${configName}`);
  if (!pkgJson) throw new Error(`Couldn't read package.json`);

  if (!Versions.gteSdkVersion(exp, '34.0.0')) {
    throw new Error(`Ejecting to a bare project is only available for SDK 34 and higher`);
  }

  // Validate that the template exists
  let sdkMajorVersionNumber = semver.major(exp.sdkVersion);
  let templateSpec = npmPackageArg(`expo-template-bare-minimum@sdk-${sdkMajorVersionNumber}`);
  try {
    await pacote.manifest(templateSpec);
  } catch (e) {
    if (e.code === 'E404') {
      throw new Error(
        `Unable to eject because an eject template for SDK ${sdkMajorVersionNumber} was not found`
      );
    } else {
      throw e;
    }
  }

  /**
   * Customize app.json
   */
  let { displayName, name } = await getAppNamesAsync(projectRoot);
  appJson.displayName = displayName;
  appJson.name = name;

  if (appJson.expo.entryPoint && appJson.expo.entryPoint !== EXPO_APP_ENTRY) {
    log(
      chalk.yellow(`expo.entryPoint is already configured, we recommend using "${EXPO_APP_ENTRY}`)
    );
  } else {
    appJson.expo.entryPoint = EXPO_APP_ENTRY;
  }

  log('Writing app.json...');
  await fse.writeFile(path.resolve('app.json'), JSON.stringify(appJson, null, 2));
  log(chalk.green('Wrote to app.json, please update it manually in the future.'));

  let defaultDependencies = {};
  let defaultDevDependencies = {};

  /**
   * Extract the template and copy it over
   */
  try {
    let tempDir = temporary.directory();
    await Exp.extractTemplateAppAsync(templateSpec, tempDir, appJson);
    fse.copySync(path.join(tempDir, 'ios'), path.join(projectRoot, 'ios'));
    fse.copySync(path.join(tempDir, 'android'), path.join(projectRoot, 'android'));
    let packageJson = fse.readJsonSync(path.join(tempDir, 'package.json'));
    defaultDependencies = packageJson.dependencies;
    defaultDevDependencies = packageJson.devDependencies;
    log('Successfully copied template native code.');
  } catch (e) {
    log(chalk.red(e.message));
    log(chalk.red(`Eject failed, see above output for any issues.`));
    log(chalk.yellow('You may want to delete the `ios` and/or `android` directories.'));
    process.exit(1);
  }

  log(`Updating your package.json...`);
  if (!pkgJson.scripts) {
    pkgJson.scripts = {};
  }
  delete pkgJson.scripts.eject;
  pkgJson.scripts.start = 'react-native start';
  pkgJson.scripts.ios = 'react-native run-ios';
  pkgJson.scripts.android = 'react-native run-android';

  if (pkgJson.scripts.postinstall) {
    pkgJson.scripts.postinstall = `jetify && ${pkgJson.scripts.postinstall}`;
    log(chalk.warn('jetifier has been added to your existing postinstall script.'));
  } else {
    pkgJson.scripts.postinstall = `jetify`;
  }

  // The template may have some dependencies beyond react/react-native/react-native-unimodules,
  // for example RNGH and Reanimated. We should prefer the version that is already being used
  // in the project for those, but swap the react/react-native/react-native-unimodules versions
  // with the ones in the template.
  let combinedDependencies = { ...defaultDependencies, ...pkgJson.dependencies };
  combinedDependencies['react-native'] = defaultDependencies['react-native'];
  combinedDependencies['react'] = defaultDependencies['react'];
  combinedDependencies['react-native-unimodules'] = defaultDependencies['react-native-unimodules'];
  pkgJson.dependencies = combinedDependencies;
  let combinedDevDependencies = { ...defaultDevDependencies, ...pkgJson.devDependencies };
  combinedDevDependencies['jetifier'] = defaultDevDependencies['jetifier'];
  pkgJson.devDependencies = combinedDevDependencies;

  await fse.writeFile(path.resolve('package.json'), JSON.stringify(pkgJson, null, 2));
  log(chalk.green('Your package.json is up to date!'));

  log(`Adding entry point...`);
  if (pkgJson.main !== EXPO_APP_ENTRY) {
    log(
      chalk.yellow(
        `Removing "main": ${pkgJson.main} from package.json. We recommend using index.js instead.`
      )
    );
  }
  delete pkgJson.main;
  await fse.writeFile(path.resolve('package.json'), JSON.stringify(pkgJson, null, 2));

  const indexjs = `import { AppRegistry } from 'react-native';
import App from './App';

AppRegistry.registerComponent('${appJson.name}', () => App);
`;
  await fse.writeFile(path.resolve('index.js'), indexjs);
  log(chalk.green('Added new entry points!'));

  log(
    chalk.grey(
      `Note that using \`${npmOrYarn} start\` will now require you to run Xcode and/or Android Studio to build the native code for your project.`
    )
  );

  log('Removing node_modules...');
  await fse.remove('node_modules');

  log('Installing new packages...');
  const packageManager = PackageManager.createForProject(projectRoot);
  await packageManager.installAsync();
  log.newLine();
}

async function getAppNamesAsync(projectRoot) {
  const { configPath, configName } = await ConfigUtils.findConfigFileAsync(projectRoot);
  const { exp, pkg: pkgJson } = await ConfigUtils.readConfigJsonAsync(projectRoot);
  const appJson = configName === 'app.json' ? JSON.parse(await fse.readFile(configPath)) : {};

  let { displayName, name } = appJson;
  if (!displayName || !name) {
    log("We have a couple of questions to ask you about how you'd like to name your app:");
    ({ displayName, name } = await prompt(
      [
        {
          name: 'displayName',
          message: "What should your app appear as on a user's home screen?",
          default: name || exp.name,
          validate: s => {
            return s.length > 0 ? true : 'App display name cannot be empty.';
          },
        },
        {
          name: 'name',
          message: 'What should your Android Studio and Xcode projects be called?',
          default: pkgJson.name ? stripDashes(pkgJson.name) : undefined,
          validate: s => {
            if (s.length === 0) {
              return 'Project name cannot be empty.';
            } else if (s.indexOf('-') !== -1 || s.indexOf(' ') !== -1) {
              return 'Project name cannot contain hyphens or spaces.';
            }
            return true;
          },
        },
      ],
      {
        nonInteractiveHelp: 'Please specify "displayName" and "name" in app.json.',
      }
    ));
  }

  return { displayName, name };
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
