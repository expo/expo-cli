import {
  WarningAggregator as ConfigWarningAggregator,
  findConfigFile,
  findDynamicConfigPath,
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
import {
  logConfigWarningsAndroid,
  logConfigWarningsIOS,
  logWarningArray,
} from '../utils/logConfigWarnings';
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
      text: chalk.red('Android configuration applied with warnings that should be fixed:'),
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
  log.nested(
    `- 🔑 Download your Android keystore (if you're not sure if you need to, just run the command and see): ${chalk.bold(
      'expo fetch:android:keystore'
    )}`
  );

  log.newLine();
  log.nested(`☑️  ${chalk.bold('When you are ready to run your project')}`);
  log.nested('To compile and run your project, execute one of the following commands:');
  let packageManager = isUsingYarn(projectRoot) ? 'yarn' : 'npm';
  log.nested(`- ${chalk.bold(packageManager === 'npm' ? 'npm run ios' : 'yarn ios')}`);
  log.nested(`- ${chalk.bold(packageManager === 'npm' ? 'npm run android' : 'yarn android')}`);
  log.nested(`- ${chalk.bold(packageManager === 'npm' ? 'npm run web' : 'yarn web')}`);
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
  // We need the SDK version to proceed
  let { exp, pkg } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  if (!exp.sdkVersion) {
    throw new Error(`Unable to find the project's SDK version. Are you in the correct directory?`);
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
   * Ensure we have the required fields that we need to eject
   */
  let name = exp.name;
  let bundleIdentifier = exp.ios?.bundleIdentifier;
  let packageName = exp.android?.package;
  let entryPoint = exp.appEntry;
  const dynamicConfigPath = findDynamicConfigPath(projectRoot);
  const configName = dynamicConfigPath ? path.basename(dynamicConfigPath) : 'app.json';

  if (dynamicConfigPath) {
    let updatingAppConfigStep = logNewSection(`Updating app configuration (${configName})`);
    let warnings: Array<[string, string, string | undefined]> = [];
    if (!name) {
      warnings.push(['name', 'A project name is required.', undefined]);
    }

    if (!bundleIdentifier) {
      warnings.push([
        'ios.bundleIdentifier',
        'An iOS bundle identifier is required.',
        'https://expo.fyi/bundle-identifier',
      ]);
    }

    if (!packageName) {
      warnings.push([
        'android.package',
        'An Android package is required.',
        'https://docs.expo.io/versions/latest/distribution/building-standalone-apps/#2-configure-appjson',
      ]);
    }

    if (entryPoint) {
      warnings.push(['entryPoint', 'Remove the entryPoint field.', undefined]);
    }

    if (warnings.length) {
      updatingAppConfigStep.fail(
        `We are unable to continue with ejecting until you make the following changes to ${configName}:`
      );
      logWarningArray(warnings);
      process.exit(-1);
    } else {
      updatingAppConfigStep.succeed(`No update to ${configName} needed.`);
    }
  } else if (configName === 'app.json') {
    const { configPath, configName } = findConfigFile(projectRoot);
    const configBuffer = await fse.readFile(configPath);
    const appJson = configName === 'app.json' ? JSON.parse(configBuffer.toString()) : {};
    appJson.expo = appJson.expo ?? {};

    name = await promptForNativeAppNameAsync(projectRoot);
    appJson.expo.name = name;

    bundleIdentifier = await getOrPromptForBundleIdentifier(projectRoot);
    appJson.expo.ios = appJson.expo.ios ?? {};
    appJson.expo.ios.bundleIdentifier = bundleIdentifier;

    packageName = await getOrPromptForPackage(projectRoot);
    appJson.expo.android = appJson.expo.android ?? {};
    appJson.expo.android.package = packageName;

    let updatingAppConfigStep = logNewSection(`Updating app configuration (${configName})`);

    if (appJson.expo.entryPoint) {
      updatingAppConfigStep.succeed(
        'App configuration (app.json) updated. Please note that expo.entryPoint has been removed.'
      );
      delete appJson.expo.entryPoint;
    } else {
      updatingAppConfigStep.succeed('App configuration (app.json) updated.');
    }

    await fse.writeFile(path.resolve('app.json'), JSON.stringify(appJson, null, 2));
    exp = appJson.expo;
  }

  /**
   * Extract the template and copy the ios and android directories over to the project directory
   */
  let defaultDependencies: any = {};
  let defaultDevDependencies: any = {};
  // NOTE(brentvatne): Removing spaces between steps for now, add back when
  // there is some additional context for steps
  // log.newLine();
  let creatingNativeProjectStep = logNewSection(
    'Creating native project directories (./ios and ./android)'
  );
  try {
    const tempDir = temporary.directory();
    await Exp.extractTemplateAppAsync(templateSpec, tempDir, { name: name! });
    fse.copySync(path.join(tempDir, 'ios'), path.join(projectRoot, 'ios'));
    fse.copySync(path.join(tempDir, 'android'), path.join(projectRoot, 'android'));
    fse.copySync(path.join(tempDir, 'index.js'), path.join(projectRoot, 'index.js'));
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
  // NOTE(brentvatne): Removing spaces between steps for now, add back when
  // there is some additional context for steps
  // log.newLine();
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

  updatingPackageJsonStep.succeed('Updated package.json and added index.js entry point.');
  // NOTE(brentvatne): Removing spaces between steps for now, add back when
  // there is some additional context for steps
  // log.newLine();

  /**
   * Install dependencies
   */
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

async function promptForNativeAppNameAsync(projectRoot: string): Promise<string> {
  const { exp } = await readConfigJsonAsync(projectRoot);

  let { name } = exp;
  if (!name) {
    log('First, we want to clarify what names we should use for your app:');
    ({ name } = await prompt(
      [
        {
          name: 'name',
          message: "What should your app appear as on a user's home screen?",
          default: exp.name,
          validate({ length }: string): true | ValidationErrorMessage {
            return length ? true : 'App display name cannot be empty.';
          },
        },
      ],
      {
        nonInteractiveHelp: 'Please specify "expo.name" in app.json / app.config.js.',
      }
    ));

    log.newLine();
  }

  return name!;
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
