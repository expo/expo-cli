import {
  WarningAggregator as ConfigWarningAggregator,
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
import ora from 'ora';

import * as PackageManager from '@expo/package-manager';
import log from '../../log';
import prompt from '../../prompt';
import configureIOSProjectAsync from '../apply/configureIOSProjectAsync';
import configureAndroidProjectAsync from '../apply/configureAndroidProjectAsync';
import { logConfigWarningsAndroid, logConfigWarningsIOS } from '../utils/logConfigWarnings';
import maybeBailOnGitStatusAsync from '../utils/maybeBailOnGitStatusAsync';

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
  if (await maybeBailOnGitStatusAsync()) return;

  await createNativeProjectsFromTemplateAsync(projectRoot);

  log.newLine();
  let applyingIOSConfigStep = logNewSection('Applying iOS configuration');
  await configureIOSProjectAsync(projectRoot);
  if (ConfigWarningAggregator.hasWarningsIOS()) {
    applyingIOSConfigStep.stopAndPersist({
      symbol: '⚠️ ',
      text: chalk.red('iOS configuration applied with warnings that should be fixed:'),
    });
    logConfigWarningsIOS();
  } else {
    applyingIOSConfigStep.succeed('All project configuration applied to iOS project');
  }
  log.newLine();

  let applyingAndroidConfigStep = logNewSection('Applying Android configuration');
  await configureAndroidProjectAsync(projectRoot);
  if (ConfigWarningAggregator.hasWarningsAndroid()) {
    applyingAndroidConfigStep.stopAndPersist({
      symbol: '⚠️ ',
      text: 'Android configuration applied with warnings that should be fixed:',
    });
    logConfigWarningsAndroid();
  } else {
    applyingAndroidConfigStep.succeed('All project configuration applied to Android project');
  }

  // TODO: integrate this with the above warnings
  await warnIfDependenciesRequireAdditionalSetupAsync(projectRoot);

  log.newLine();
  log.nested(`➡️  ${chalk.bold('Next steps')}`);
  // TODO: run pod install automatically!

  log.nested(
    `- 👆 Review the logs above and look for any warnings (⚠️ ) that might need follow-up.`
  );
  log.nested(
    `- 💡 You may want to run ${chalk.bold(
      'npx @react-native-community/cli doctor'
    )} to help installing CocoaPods and any other tools that your app may need to run your native projects.`
  );
  log.nested(
    `- 🍫 With CocoaPods installed, initialize the project workspace: ${chalk.bold(
      'cd ios && pod install'
    )}`
  );

  log.newLine();
  log.nested(`☑️  ${chalk.bold('When you are ready to run your project')}`);
  log.nested('To compile and run your project, execute one of the following commands:');
  let packageManager = isUsingYarn(projectRoot) ? 'yarn' : 'npm';
  log.nested(`- ${chalk.bold(packageManager === 'npm' ? 'npm run ios' : 'yarn ios')}`);
  log.nested(`- ${chalk.bold(packageManager === 'npm' ? 'npm run android' : 'yarn android')}`);
  log.nested(`- ${chalk.bold(packageManager === 'npm' ? 'npm run web' : 'yarn web')}`);
  log.newLine();
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

function logNewSection(title: string) {
  let spinner = ora(chalk.bold(title));
  spinner.start();
  return spinner;
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

  let packageName = await getOrPromptForPackage(projectRoot);
  appJson.expo.android = appJson.expo.android ?? {};
  appJson.expo.android.package = packageName;

  // TODO: remove entryPoint and log about it for sdk 37 changes
  if (appJson.expo.entryPoint && appJson.expo.entryPoint !== EXPO_APP_ENTRY) {
    log(`- expo.entryPoint is already configured, we recommend using "${EXPO_APP_ENTRY}`);
  } else {
    appJson.expo.entryPoint = EXPO_APP_ENTRY;
  }

  let updatingAppConfigStep = logNewSection('Updating app configuration (app.json)');
  await fse.writeFile(path.resolve('app.json'), JSON.stringify(appJson, null, 2));
  // TODO: if app.config.js, need to provide some other info here
  updatingAppConfigStep.succeed('App configuration (app.json) updated.');

  /**
   * Extract the template and copy the ios and android directories over to the project directory
   */
  let defaultDependencies: any = {};
  let defaultDevDependencies: any = {};
  log.newLine();
  let creatingNativeProjectStep = logNewSection(
    'Creating native project directories (./ios and ./android)'
  );
  try {
    const tempDir = temporary.directory();
    await Exp.extractTemplateAppAsync(templateSpec, tempDir, appJson);
    fse.copySync(path.join(tempDir, 'ios'), path.join(projectRoot, 'ios'));
    fse.copySync(path.join(tempDir, 'android'), path.join(projectRoot, 'android'));
    const { dependencies, devDependencies } = JsonFile.read(path.join(tempDir, 'package.json'));
    defaultDependencies = createDependenciesMap(dependencies);
    defaultDevDependencies = createDependenciesMap(devDependencies);
    creatingNativeProjectStep.succeed('Created native project directories (./ios and ./android).');
  } catch (e) {
    log(chalk.red(e.message));
    creatingNativeProjectStep.fail(
      'Failed to create the native project - see the output above for more information.'
    );
    log(
      chalk.yellow(
        'You may want to delete the `./ios` and/or `./android` directories before running eject again.'
      )
    );
    process.exit(1);
  }

  /**
   * Update package.json scripts - `npm start` should default to `react-native
   * start` rather than `expo start` after ejecting, for example.
   */
  log.newLine();
  let updatingPackageJsonStep = logNewSection(
    'Updating your package.json scripts, dependencies, and main file'
  );
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
      log(chalk.green('jetifier has been added to your existing postinstall script.'));
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
  if (pkg.main !== EXPO_APP_ENTRY && pkg.main) {
    log(`🚨 Removing "main": ${pkg.main} from package.json. We recommend using index.js instead.`);
  }
  delete pkg.main;
  await fse.writeFile(path.resolve('package.json'), JSON.stringify(pkg, null, 2));

  // TODO: this needs to change for sdk 37+
  const indexjs = `import { AppRegistry, Platform } from 'react-native';
import App from './App';

AppRegistry.registerComponent('${appJson.name}', () => App);

if (Platform.OS === 'web') {
  const rootTag = document.getElementById('root') || document.getElementById('main');
  AppRegistry.runApplication('${appJson.name}', { rootTag });
}
`;
  await fse.writeFile(path.resolve('index.js'), indexjs);
  updatingPackageJsonStep.succeed('Updated package.json and added index.js entry point.');

  log.newLine();
  let installingDependenciesStep = logNewSection('Installing dependencies');
  await fse.remove('node_modules');
  const packageManager = PackageManager.createForProject(projectRoot, { log, silent: true });
  try {
    await packageManager.installAsync();
    installingDependenciesStep.succeed('Installed dependencies');
  } catch (e) {
    installingDependenciesStep.fail(
      'Something when wrong installing dependencies, check your package manager logfile. Continuing with ejecting, you can debug this afterwards.'
    );
  }
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
    log('First, we want to clarify what names we should use for your app:');
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

  log.newLine();

  return { displayName, name };
}

async function getOrPromptForBundleIdentifier(projectRoot: string): Promise<string> {
  let { exp } = getConfig(projectRoot);

  if (exp.ios?.bundleIdentifier) {
    return exp.ios.bundleIdentifier;
  }

  // TODO: add example based on slug or name
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

  log.newLine();
  return bundleIdentifier;
}

async function getOrPromptForPackage(projectRoot: string): Promise<string> {
  let { exp } = getConfig(projectRoot);

  if (exp.android?.package) {
    return exp.android.package;
  }

  // TODO: add example based on slug or name
  log(
    `Now we need to know your ${terminalLink(
      'Android package',
      'https://expo.fyi/android-package'
    )}. You can change this in the future if you need to.`
  );

  const { packageName } = await prompt([
    {
      name: 'packageName',
      message: `What would you like your package to be named?`,
      validate: (value: string) => /^[a-zA-Z][a-zA-Z0-9\-.]+$/.test(value),
    },
  ]);

  log.newLine();
  return packageName;
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

  log.newLine();
  let warnAdditionalSetupStep = logNewSection(
    'Checking if any additional setup steps are required for installed SDK packages.'
  );

  let plural = packagesToWarn.length > 1;

  warnAdditionalSetupStep.stopAndPersist({
    symbol: '⚠️ ',
    text: chalk.red(
      `Your app includes ${chalk.bold(`${packagesToWarn.length}`)} package${
        plural ? 's' : ''
      } that require${plural ? '' : 's'} additional setup in order to run:`
    ),
  });

  packagesToWarn.forEach(pkgName => {
    log.nested(`- ${chalk.bold(pkgName)}: ${pkgsWithExtraSetup[pkgName]}`);
  });
}

export function stripDashes(s: string): string {
  return s.replace(/\s|-/g, '');
}
