import {
  WarningAggregator as ConfigWarningAggregator,
  findConfigFile,
  getConfig,
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
import { usesOldExpoUpdatesAsync } from '../utils/ProjectUtils';

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
  await installNodeModulesAsync(projectRoot);

  await configureIOSStepAsync(projectRoot);
  await configureAndroidStepAsync(projectRoot);

  let podsInstalled = await installPodsAsync(projectRoot);
  await warnIfDependenciesRequireAdditionalSetupAsync(projectRoot);

  log.newLine();
  log.nested(`➡️  ${chalk.bold('Next steps')}`);

  log.nested(
    `- 👆 Review the logs above and look for any warnings (⚠️ ) that might need follow-up.`
  );
  log.nested(
    `- 💡 You may want to run ${chalk.bold(
      'npx @react-native-community/cli doctor'
    )} to help install any tools that your app may need to run your native projects.`
  );
  if (!podsInstalled) {
    log.nested(
      `- 🍫 When CocoaPods is installed, initialize the project workspace: ${chalk.bold(
        'cd ios && pod install'
      )}`
    );
  }
  log.nested(
    `- 🔑 Download your Android keystore (if you're not sure if you need to, just run the command and see): ${chalk.bold(
      'expo fetch:android:keystore'
    )}`
  );

  if (await usesOldExpoUpdatesAsync(projectRoot)) {
    log.nested(
      `- 🚀 ${terminalLink(
        'expo-updates',
        'https://github.com/expo/expo/blob/master/packages/expo-updates/README.md'
      )} has been configured in your project. Before you do a release build, make sure you run ${chalk.bold(
        'expo publish'
      )}. ${terminalLink('Learn more.', 'https://expo.fyi/release-builds-with-expo-updates')}`
    );
  }

  log.newLine();
  log.nested(`☑️  ${chalk.bold('When you are ready to run your project')}`);
  log.nested(
    'To compile and run your project in development, execute one of the following commands:'
  );
  let packageManager = PackageManager.isUsingYarn(projectRoot) ? 'yarn' : 'npm';
  log.nested(`- ${chalk.bold(packageManager === 'npm' ? 'npm run ios' : 'yarn ios')}`);
  log.nested(`- ${chalk.bold(packageManager === 'npm' ? 'npm run android' : 'yarn android')}`);
  log.nested(`- ${chalk.bold(packageManager === 'npm' ? 'npm run web' : 'yarn web')}`);
}

async function configureIOSStepAsync(projectRoot: string) {
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
}

async function installPodsAsync(projectRoot: string) {
  log.newLine();
  let step = logNewSection('Installing CocoaPods.');
  if (process.platform !== 'darwin') {
    step.succeed('Skipped installing CocoaPods because operating system is not on macOS.');
    return false;
  }
  const packageManager = new PackageManager.CocoaPodsPackageManager({
    cwd: path.join(projectRoot, 'ios'),
    log,
    silent: !process.env.EXPO_DEBUG,
  });

  if (!(await packageManager.isCLIInstalledAsync())) {
    try {
      // prompt user -- do you want to install cocoapods right now?
      step.text = 'CocoaPods CLI not found in your PATH, installing it now.';
      step.render();
      await packageManager.installCLIAsync();
      step.succeed('Installed CocoaPods CLI');
      step = logNewSection('Running `pod install` in the `ios` directory.');
    } catch (e) {
      step.stopAndPersist({
        symbol: '⚠️ ',
        text: chalk.red(
          'Unable to install the CocoaPods CLI. Continuing with ejecting, you can install CocoaPods afterwards.'
        ),
      });
      if (e.message) {
        log(`- ${e.message}`);
      }
      return false;
    }
  }

  try {
    await packageManager.installAsync();
    step.succeed('Installed pods and initialized Xcode workspace.');
    return true;
  } catch (e) {
    step.stopAndPersist({
      symbol: '⚠️ ',
      text: chalk.red(
        'Something when wrong running `pod install` in the `ios` directory. Continuing with ejecting, you can debug this afterwards.'
      ),
    });
    if (e.message) {
      log(`- ${e.message}`);
    }
    return false;
  }
}

async function installNodeModulesAsync(projectRoot: string) {
  let installingDependenciesStep = logNewSection('Installing JavaScript dependencies.');
  await fse.remove('node_modules');
  const packageManager = PackageManager.createForProject(projectRoot, { log, silent: true });
  try {
    await packageManager.installAsync();
    installingDependenciesStep.succeed('Installed JavaScript dependencies.');
  } catch (e) {
    installingDependenciesStep.fail(
      chalk.red(
        `Something when wrong installing JavaScript dependencies, check your ${
          packageManager.name
        } logfile or run ${chalk.bold(
          `${packageManager.name.toLowerCase()} install`
        )} again manually.`
      )
    );
    // TODO: actually show the error message from the package manager! :O
    process.exit(1);
  }
}

async function configureAndroidStepAsync(projectRoot: string) {
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
}

function logNewSection(title: string) {
  let spinner = ora(chalk.bold(title));
  spinner.start();
  return spinner;
}

async function createNativeProjectsFromTemplateAsync(projectRoot: string): Promise<void> {
  // We need the SDK version to proceed
  const { exp, pkg } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
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

  let name = await promptForNativeAppNameAsync(projectRoot);
  appJson.expo.name = name;

  let bundleIdentifier = await getOrPromptForBundleIdentifier(projectRoot);
  appJson.expo.ios = appJson.expo.ios ?? {};
  appJson.expo.ios.bundleIdentifier = bundleIdentifier;

  let packageName = await getOrPromptForPackage(projectRoot, bundleIdentifier);
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
  // NOTE(brentvatne): Removing spaces between steps for now, add back when
  // there is some additioanl context for steps
  // log.newLine();
  let creatingNativeProjectStep = logNewSection(
    'Creating native project directories (./ios and ./android) and updating .gitignore'
  );
  try {
    const tempDir = temporary.directory();
    await Exp.extractTemplateAppAsync(templateSpec, tempDir, appJson.expo);
    fse.copySync(path.join(tempDir, 'ios'), path.join(projectRoot, 'ios'));
    fse.copySync(path.join(tempDir, 'android'), path.join(projectRoot, 'android'));
    fse.copySync(path.join(tempDir, 'index.js'), path.join(projectRoot, 'index.js'));
    await mergeGitIgnoreAsync(
      path.join(projectRoot, '.gitignore'),
      path.join(tempDir, '.gitignore')
    );
    const { dependencies, devDependencies } = JsonFile.read(path.join(tempDir, 'package.json'));
    defaultDependencies = createDependenciesMap(dependencies);
    defaultDevDependencies = createDependenciesMap(devDependencies);
    creatingNativeProjectStep.succeed(
      'Created native project directories (./ios and ./android) and updated .gitignore.'
    );
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
  // there is some additioanl context for steps
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
  let removedPkgMain;
  if (pkg.main !== EXPO_APP_ENTRY && pkg.main !== 'index.js' && pkg.main) {
    removedPkgMain = pkg.main;
  }
  delete pkg.main;
  await fse.writeFile(path.resolve('package.json'), JSON.stringify(pkg, null, 2));

  updatingPackageJsonStep.succeed(
    'Updated package.json and added index.js entry point for iOS and Android.'
  );
  if (removedPkgMain) {
    log(
      `- Removed ${chalk.bold(
        `"main": "${removedPkgMain}"`
      )} from package.json because we recommend using index.js as main instead.`
    );
    log.newLine();
  }
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

async function getOrPromptForBundleIdentifier(
  projectRoot: string,
  defaultValue?: string
): Promise<string> {
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
      default: defaultValue,
      message: `What would you like your bundle identifier to be?`,
      validate: (value: string) => /^[a-zA-Z][a-zA-Z0-9\-.]+$/.test(value),
    },
  ]);

  log.newLine();
  return bundleIdentifier;
}

async function getOrPromptForPackage(projectRoot: string, defaultValue?: string): Promise<string> {
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
      default: defaultValue,
      message: `What would you like your package to be named?`,
      validate: (value: string) => /^[a-zA-Z][a-zA-Z0-9\-.]+$/.test(value),
    },
  ]);

  log.newLine();
  return packageName;
}

async function mergeGitIgnoreAsync(targetGitIgnorePath: string, sourceGitIgnorePath: string) {
  if (!fse.existsSync(targetGitIgnorePath)) {
    // No gitignore in the project already, no need to merge anything into anything. I guess they
    // are not using git :O
    return;
  }

  if (!fse.existsSync(sourceGitIgnorePath)) {
    // Maybe we don't have a gitignore in the template project
    return;
  }

  let targetGitIgnore = fse.readFileSync(targetGitIgnorePath).toString();
  let sourceGitIgnore = fse.readFileSync(sourceGitIgnorePath).toString();

  let mergedGitIgnore = `${targetGitIgnore}
# The following contents were automatically generated by expo-cli during eject
# ----------------------------------------------------------------------------

${sourceGitIgnore}`;
  fse.writeFileSync(targetGitIgnorePath, mergedGitIgnore);
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
