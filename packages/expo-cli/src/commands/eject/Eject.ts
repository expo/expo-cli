import {
  findConfigFile,
  getConfig,
  isUsingYarn,
  readConfigJsonAsync,
  resolveModule,
} from '@expo/config';
import JsonFile from '@expo/json-file';
import { Exp, Versions } from '@expo/xdl';
import chalk from 'chalk';
import fse from 'fs-extra';
import npmPackageArg from 'npm-package-arg';
import pacote from 'pacote';
import path from 'path';
import semver from 'semver';
import temporary from 'tempy';
import terminalLink from 'terminal-link';

import * as PackageManager from '@expo/package-manager';
import log from '../../log';
import prompt from '../../prompt';
import { validateGitStatusAsync } from '../utils/ProjectUtils';
import configureIOSProjectAsync from '../apply/configureIOSProjectAsync';
import configureAndroidProjectAsync from '../apply/configureAndroidProjectAsync';

type ValidationErrorMessage = string;

type DependenciesMap = { [key: string]: string | number };

export type EjectAsyncOptions = {
  verbose?: boolean;
  force?: boolean;
  packageManager?: 'npm' | 'yarn';
};

const EXPO_APP_ENTRY = 'node_modules/expo/AppEntry.js';

/**
 * Entry point into the eject process, delegates to other helpers to perform various steps.
 */
export async function ejectAsync(projectRoot: string, options: EjectAsyncOptions) {
  await validateGitStatusAsync();
  log.nested('');

  await createNativeProjectsFromTemplateAsync(projectRoot);

  log.nested('Applying iOS configuration');
  await configureIOSProjectAsync(projectRoot);

  log.nested('Applying Android configuration');
  await configureAndroidProjectAsync(projectRoot);

  log.nested(chalk.green('Ejected successfully!'));
  log.newLine();

  // TODO: run pod install automatically
  log.nested(
    `Before running your app on iOS, make sure you have CocoaPods installed and initialize the project:`
  );
  log.nested('');
  log.nested(`  cd ios`);
  log.nested(`  pod install`);
  log.nested('');

  log.nested('Then you can run the project:');
  log.nested('');
  let packageManager = isUsingYarn(projectRoot) ? 'yarn' : 'npm';
  log.nested(`  ${packageManager === 'npm' ? 'npm run android' : 'yarn android'}`);
  log.nested(`  ${packageManager === 'npm' ? 'npm run ios' : 'yarn ios'}`);

  await warnIfDependenciesRequireAdditionalSetupAsync(projectRoot);
}

/**
 * Create an object of type DependenciesMap a dependencies object or throw if not valid.
 *
 * @param dependencies - ideally an object of type {[key]: string} - if not then this will error.
 */
function createDependenciesMap(dependencies: any): DependenciesMap {
  if (typeof dependencies !== 'object') {
    throw new Error(`Dependency map is invalid, expected object but got ${typeof dependencies}`);
  }

  const outputMap: DependenciesMap = {};
  if (!dependencies) return outputMap;

  for (const key of Object.keys(dependencies)) {
    const value = dependencies[key];
    if (typeof value === 'string') {
      outputMap[key] = value;
    } else {
      throw new Error(
        `Dependency for key \`${key}\` should be a \`string\`, instead got: \`{ ${key}: ${JSON.stringify(
          value
        )} }\``
      );
    }
  }
  return outputMap;
}

async function createNativeProjectsFromTemplateAsync(projectRoot: string): Promise<void> {
  const useYarn = isUsingYarn(projectRoot);
  const npmOrYarn = useYarn ? 'yarn' : 'npm';

  // We need the SDK version to proceed
  const { exp, pkg } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  if (!exp.sdkVersion) {
    throw new Error(`Unable to find the project's SDK version. Are you in the correct directory?`);
  }

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
        `Unable to eject because an eject template for SDK ${sdkMajorVersionNumber} was not found.`
      );
    } else {
      throw e;
    }
  }

  /**
   * Set names to be used for the native projects and configure appEntry so users can continue
   * to use Expo client on ejected projects, even though we change the "main" to index.js for bare.
   *
   * TODO: app.config.js will become more prominent and we can't depend on
   * being able to write to the config
   */
  const { configPath, configName } = findConfigFile(projectRoot);
  const configBuffer = await fse.readFile(configPath);
  const appJson = configName === 'app.json' ? JSON.parse(configBuffer.toString()) : {};

  // Just to be sure
  appJson.expo = appJson.expo ?? {};

  let { displayName, name } = await promptForNativeAppNamesAsync(projectRoot);
  appJson.displayName = displayName;
  appJson.expo.name = name;
  appJson.name = name;

  let bundleIdentifier = await getOrPromptForBundleIdentifier(projectRoot);
  appJson.expo.ios = appJson.expo.ios ?? {};
  appJson.expo.ios.bundleIdentifier = bundleIdentifier;

  if (appJson.expo.entryPoint && appJson.expo.entryPoint !== EXPO_APP_ENTRY) {
    log(
      chalk.yellow(`expo.entryPoint is already configured, we recommend using "${EXPO_APP_ENTRY}`)
    );
  } else {
    appJson.expo.entryPoint = EXPO_APP_ENTRY;
  }

  log.newLine();
  log('Updating app.json...');
  await fse.writeFile(path.resolve('app.json'), JSON.stringify(appJson, null, 2));

  /**
   * Extract the template and copy the ios and android directories over to the project directory
   */
  let defaultDependencies: any = {};
  let defaultDevDependencies: any = {};
  try {
    const tempDir = temporary.directory();
    await Exp.extractTemplateAppAsync(templateSpec, tempDir, appJson);
    fse.copySync(path.join(tempDir, 'ios'), path.join(projectRoot, 'ios'));
    fse.copySync(path.join(tempDir, 'android'), path.join(projectRoot, 'android'));
    const { dependencies, devDependencies } = JsonFile.read(path.join(tempDir, 'package.json'));
    defaultDependencies = createDependenciesMap(dependencies);
    defaultDevDependencies = createDependenciesMap(devDependencies);
    log('Successfully copied template native code.');
  } catch (e) {
    log(chalk.red(e.message));
    log(chalk.red(`Ejecting failed 😢 - see the output above for more information.`));
    log(chalk.yellow('You may want to delete the `ios` and/or `android` directories.'));
    process.exit(1);
  }

  /**
   * Update package.json scripts - `npm start` should default to `react-native
   * start` rather than `expo start` after ejecting, for example.
   */
  log(`Updating your package.json...`);
  if (!pkg.scripts) {
    pkg.scripts = {};
  }
  delete pkg.scripts.eject;
  pkg.scripts.start = 'react-native start';
  pkg.scripts.ios = 'react-native run-ios';
  pkg.scripts.android = 'react-native run-android';

  // Jetifier is only needed for SDK 34 & 35
  if (Versions.lteSdkVersion(exp, '35.0.0')) {
    if (pkg.scripts.postinstall) {
      pkg.scripts.postinstall = `jetify && ${pkg.scripts.postinstall}`;
      log(chalk.bgYellow.black('jetifier has been added to your existing postinstall script.'));
    } else {
      pkg.scripts.postinstall = `jetify`;
    }
  }

  /**
   * Update package.json dependencies by combining the dependencies in the project we are ejecting
   * with the dependencies in the template project. Does the same for devDependencies.
   *
   * - The template may have some dependencies beyond react/react-native/react-native-unimodules,
   *   for example RNGH and Reanimated. We should prefer the version that is already being used
   *   in the project for those, but swap the react/react-native/react-native-unimodules versions
   *   with the ones in the template.
   */

  const combinedDependencies: DependenciesMap = createDependenciesMap({
    ...defaultDependencies,
    ...pkg.dependencies,
  });

  for (const dependenciesKey of ['react', 'react-native-unimodules', 'react-native']) {
    combinedDependencies[dependenciesKey] = defaultDependencies[dependenciesKey];
  }
  const combinedDevDependencies: DependenciesMap = createDependenciesMap({
    ...defaultDevDependencies,
    ...pkg.devDependencies,
  });

  // Jetifier is only needed for SDK 34 & 35
  if (Versions.lteSdkVersion(exp, '35.0.0')) {
    combinedDevDependencies['jetifier'] = defaultDevDependencies['jetifier'];
  }

  // Save the dependencies
  pkg.dependencies = combinedDependencies;
  pkg.devDependencies = combinedDevDependencies;
  await fse.writeFile(path.resolve('package.json'), JSON.stringify(pkg, null, 2));

  /**
   * Add new app entry points
   */
  log(`Adding entry point...`);
  if (pkg.main !== EXPO_APP_ENTRY) {
    log(
      chalk.yellow(
        `Removing "main": ${pkg.main} from package.json. We recommend using index.js instead.`
      )
    );
  }
  delete pkg.main;
  await fse.writeFile(path.resolve('package.json'), JSON.stringify(pkg, null, 2));

  const indexjs = `import { AppRegistry, Platform } from 'react-native';
import App from './App';

AppRegistry.registerComponent('${appJson.name}', () => App);

if (Platform.OS === 'web') {
  const rootTag = document.getElementById('root') || document.getElementById('main');
  AppRegistry.runApplication('${appJson.name}', { rootTag });
}
`;
  await fse.writeFile(path.resolve('index.js'), indexjs);
  log(chalk.green('Added new entry points!'));

  log('Removing node_modules...');
  await fse.remove('node_modules');

  log('Installing new packages...');
  const packageManager = PackageManager.createForProject(projectRoot, { log });
  await packageManager.installAsync();
}

/**
 * Returns a name that adheres to Xcode and Android naming conventions.
 *
 * - package name: https://docs.oracle.com/javase/tutorial/java/package/namingpkgs.html
 * @param projectRoot
 */
async function promptForNativeAppNamesAsync(
  projectRoot: string
): Promise<{ displayName: string; name: string }> {
  const { configPath, configName } = findConfigFile(projectRoot);
  const { exp, pkg } = await readConfigJsonAsync(projectRoot);

  const configBuffer = await fse.readFile(configPath);
  const appJson = configName === 'app.json' ? JSON.parse(configBuffer.toString()) : {};

  let { displayName, name } = appJson;
  if (!displayName || !name) {
    log("We have a couple of questions to ask you about how you'd like to name your app:");
    ({ displayName, name } = await prompt(
      [
        {
          name: 'displayName',
          message: "What should your app appear as on a user's home screen?",
          default: name || exp.name,
          validate({ length }: string): true | ValidationErrorMessage {
            return length ? true : 'App display name cannot be empty.';
          },
        },
        {
          name: 'name',
          message: 'What should your Android Studio and Xcode projects be called?',
          default: pkg.name ? stripDashes(pkg.name) : undefined,
          validate(value: string): true | ValidationErrorMessage {
            if (value.length === 0) {
              return 'Project name cannot be empty.';
            } else if (value.includes('-') || value.includes(' ')) {
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

async function getOrPromptForBundleIdentifier(projectRoot: string): Promise<string> {
  let { exp } = getConfig(projectRoot);

  if (exp.ios?.bundleIdentifier) {
    return exp.ios.bundleIdentifier;
  }

  // TODO: add example based on slug or name
  log.newLine();
  log(
    `Now we need to know your ${terminalLink(
      'iOS bundle identifier',
      'https://expo.fyi/bundle-identifier'
    )}. You can change this in the future if you need to.`
  );

  const { bundleIdentifier } = await prompt([
    {
      name: 'bundleIdentifier',
      message: `What would you like your bundle identifier to be?`,
      validate: (value: string) => /^[a-zA-Z][a-zA-Z0-9\-.]+$/.test(value),
    },
  ]);

  return bundleIdentifier;
}

/**
 * Some packages are not configured automatically on eject and may require
 * users to add some code, eg: to their AppDelegate.
 */
async function warnIfDependenciesRequireAdditionalSetupAsync(projectRoot: string): Promise<void> {
  // We just need the custom `nodeModulesPath` from the config.
  const { exp, pkg } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
  });

  const pkgsWithExtraSetup = await JsonFile.readAsync(
    resolveModule('expo/requiresExtraSetup.json', projectRoot, exp)
  );
  const packagesToWarn: string[] = Object.keys(pkg.dependencies).filter(pkgName =>
    pkgsWithExtraSetup.hasOwnProperty(pkgName)
  );

  if (packagesToWarn.length === 0) {
    return;
  }

  let plural = packagesToWarn.length > 1;
  log.nested('');
  log.nested(
    chalk.yellow(
      `Warning: your app includes ${chalk.bold(`${packagesToWarn.length}`)} package${
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

export function stripDashes(s: string): string {
  return s.replace(/\s|-/g, '');
}
