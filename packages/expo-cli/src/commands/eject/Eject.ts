import {
  WarningAggregator as ConfigWarningAggregator,
  ExpoConfig,
  PackageJSONConfig,
  getConfig,
  resolveModule,
} from '@expo/config';
import JsonFile from '@expo/json-file';
import * as PackageManager from '@expo/package-manager';
import { Exp } from '@expo/xdl';
import chalk from 'chalk';
import program from 'commander';
import fse from 'fs-extra';
import npmPackageArg from 'npm-package-arg';
import ora from 'ora';
import pacote from 'pacote';
import path from 'path';
import semver from 'semver';
import temporary from 'tempy';
import terminalLink from 'terminal-link';

import log from '../../log';
import prompt from '../../prompt';
import configureAndroidProjectAsync from '../apply/configureAndroidProjectAsync';
import configureIOSProjectAsync from '../apply/configureIOSProjectAsync';
import { usesOldExpoUpdatesAsync } from '../utils/ProjectUtils';
import { logConfigWarningsAndroid, logConfigWarningsIOS } from '../utils/logConfigWarnings';
import maybeBailOnGitStatusAsync from '../utils/maybeBailOnGitStatusAsync';
import { getOrPromptForBundleIdentifier, getOrPromptForPackage } from './ConfigValidation';

type ValidationErrorMessage = string;

type DependenciesMap = { [key: string]: string | number };

export type EjectAsyncOptions = {
  verbose?: boolean;
  force?: boolean;
  packageManager?: 'npm' | 'yarn';
};

/**
 * Entry point into the eject process, delegates to other helpers to perform various steps.
 *
 * 1. Verify git is clean
 * 2. Create native projects (ios, android)
 * 3. Install node modules
 * 4. Apply config to native projects
 * 5. Install CocoaPods
 * 6. Log project info
 */
export async function ejectAsync(projectRoot: string, options?: EjectAsyncOptions): Promise<void> {
  if (await maybeBailOnGitStatusAsync()) return;

  await createNativeProjectsFromTemplateAsync(projectRoot);
  await installNodeModulesAsync(projectRoot);

  // Apply Expo config to native projects
  await configureIOSStepAsync(projectRoot);
  await configureAndroidStepAsync(projectRoot);

  const podsInstalled = await installPodsAsync(projectRoot);
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
  const packageManager = PackageManager.isUsingYarn(projectRoot) ? 'yarn' : 'npm';
  log.nested(`- ${chalk.bold(packageManager === 'npm' ? 'npm run ios' : 'yarn ios')}`);
  log.nested(`- ${chalk.bold(packageManager === 'npm' ? 'npm run android' : 'yarn android')}`);
  log.nested(`- ${chalk.bold(packageManager === 'npm' ? 'npm run web' : 'yarn web')}`);
}

async function configureIOSStepAsync(projectRoot: string) {
  log.newLine();
  const applyingIOSConfigStep = logNewSection('Applying iOS configuration');
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
      await PackageManager.CocoaPodsPackageManager.installCLIAsync({
        nonInteractive: program.nonInteractive,
        spawnOptions: packageManager.options,
      });
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

/**
 * Wraps PackageManager to install node modules and adds CLI logs.
 *
 * @param projectRoot
 */
async function installNodeModulesAsync(projectRoot: string) {
  const installingDependenciesStep = logNewSection('Installing JavaScript dependencies.');
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
  const applyingAndroidConfigStep = logNewSection('Applying Android configuration');
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
  const spinner = ora(chalk.bold(title));
  spinner.start();
  return spinner;
}

async function createNativeProjectsFromTemplateAsync(projectRoot: string): Promise<void> {
  // We need the SDK version to proceed

  let exp: ExpoConfig;
  let pkg: PackageJSONConfig;
  try {
    const config = getConfig(projectRoot);
    exp = config.exp;
    pkg = config.pkg;

    // If no config exists in the file system then we should generate one so the process doesn't fail.
    if (!config.dynamicConfigPath && !config.staticConfigPath) {
      // Don't check for a custom config path because the process should fail if a custom file doesn't exist.
      // Write the generated config.
      // writeConfigJsonAsync(projectRoot, config.exp);
      await JsonFile.writeAsync(
        path.join(projectRoot, 'app.json'),
        { expo: config.exp },
        { json5: false }
      );
    }
  } catch (error) {
    // TODO(Bacon): Currently this is already handled in the command
    log();
    log(chalk.red(error.message));
    log();
    process.exit(1);
  }

  // Validate that the template exists
  const sdkMajorVersionNumber = semver.major(exp.sdkVersion!);
  const templateSpec = npmPackageArg(`expo-template-bare-minimum@sdk-${sdkMajorVersionNumber}`);
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
   */
  if (!exp.name) {
    exp.name = await promptForNativeAppNameAsync(exp);
  }

  // Prompt for the Android package first because it's more strict than the bundle identifier
  // this means you'll have a better chance at matching the bundle identifier with the package name.
  const packageName = await getOrPromptForPackage(projectRoot);
  exp.android = exp.android ?? {};
  exp.android.package = packageName;

  const bundleIdentifier = await getOrPromptForBundleIdentifier(projectRoot);
  exp.ios = exp.ios ?? {};
  exp.ios.bundleIdentifier = bundleIdentifier;

  if (exp.entryPoint) {
    delete exp.entryPoint;
    log(`- expo.entryPoint is not needed and has been removed.`);
  }

  const updatingAppConfigStep = logNewSection('Updating app configuration (app.json)');
  await fse.writeFile(path.resolve('app.json'), JSON.stringify({ expo: exp }, null, 2));
  // TODO: if app.config.js, need to provide some other info here
  updatingAppConfigStep.succeed('App configuration (app.json) updated.');

  /**
   * Extract the template and copy the ios and android directories over to the project directory
   */
  let defaultDependencies: any = {};
  let defaultDevDependencies: any = {};
  // NOTE(brentvatne): Removing spaces between steps for now, add back when
  // there is some additional context for steps
  // log.newLine();
  const creatingNativeProjectStep = logNewSection(
    'Creating native project directories (./ios and ./android) and updating .gitignore'
  );
  let tempDir;
  try {
    tempDir = temporary.directory();
    await Exp.extractTemplateAppAsync(templateSpec, tempDir, exp);
    fse.copySync(path.join(tempDir, 'ios'), path.join(projectRoot, 'ios'));
    fse.copySync(path.join(tempDir, 'android'), path.join(projectRoot, 'android'));
    fse.copySync(path.join(tempDir, 'index.js'), path.join(projectRoot, 'index.js'));
    mergeGitIgnoreFiles(path.join(projectRoot, '.gitignore'), path.join(tempDir, '.gitignore'));
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
   * Add metro config, or warn if metro config already exists. The developer will need to add the
   * hashAssetFiles plugin manually.
   */

  const updatingMetroConfigStep = logNewSection('Adding Metro bundler configuration');
  try {
    if (
      fse.existsSync(path.join(projectRoot, 'metro.config.js')) ||
      fse.existsSync(path.join(projectRoot, 'metro.config.json')) ||
      pkg.metro ||
      fse.existsSync(path.join(projectRoot, 'rn-cli.config.js'))
    ) {
      throw new Error('Existing Metro configuration found; not overwriting.');
    }

    fse.copySync(path.join(tempDir, 'metro.config.js'), path.join(projectRoot, 'metro.config.js'));
    updatingMetroConfigStep.succeed('Added Metro bundler configuration.');
  } catch (e) {
    updatingMetroConfigStep.stopAndPersist({
      symbol: '⚠️ ',
      text: chalk.red('Metro bundler configuration not applied:'),
    });
    log.nested(`- ${e.message}`);
    log.nested(
      `- You will need to add the ${chalk.bold(
        'hashAssetFiles'
      )} plugin to your Metro configuration. ${terminalLink(
        'Example.',
        'https://github.com/expo/expo/blob/master/packages/expo-updates/README.md#metroconfigjs'
      )}`
    );
    log.newLine();
  }

  /**
   * Update package.json scripts - `npm start` should default to `react-native
   * start` rather than `expo start` after ejecting, for example.
   */
  // NOTE(brentvatne): Removing spaces between steps for now, add back when
  // there is some additional context for steps
  // log.newLine();
  const updatingPackageJsonStep = logNewSection(
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
   * - The same applies to expo-updates -- since some native project configuration may depend on the
   *   version, we should always use the version of expo-updates in the template.
   */

  const combinedDependencies: DependenciesMap = createDependenciesMap({
    ...defaultDependencies,
    ...pkg.dependencies,
  });

  for (const dependenciesKey of [
    'react',
    'react-native-unimodules',
    'react-native',
    'expo-updates',
  ]) {
    combinedDependencies[dependenciesKey] = defaultDependencies[dependenciesKey];
  }
  const combinedDevDependencies: DependenciesMap = createDependenciesMap({
    ...defaultDevDependencies,
    ...pkg.devDependencies,
  });

  // Save the dependencies
  pkg.dependencies = combinedDependencies;
  pkg.devDependencies = combinedDevDependencies;

  /**
   * Add new app entry points
   */
  let removedPkgMain;
  // Check that the pkg.main doesn't match:
  // - ./node_modules/expo/AppEntry
  // - ./node_modules/expo/AppEntry.js
  // - node_modules/expo/AppEntry.js
  // - expo/AppEntry.js
  // - expo/AppEntry
  if (!isPkgMainExpoAppEntry(pkg.main) && pkg.main !== 'index.js' && pkg.main) {
    // Save the custom
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

async function promptForNativeAppNameAsync({ name }: Pick<ExpoConfig, 'name'>): Promise<string> {
  log('First, we want to clarify what names we should use for your app:');
  const result = await prompt(
    [
      {
        name: 'name',
        message: "What should your app appear as on a user's home screen?",
        default: name,
        validate({ length }: string): true | ValidationErrorMessage {
          return length ? true : 'App display name cannot be empty.';
        },
      },
    ],
    {
      nonInteractiveHelp: 'Please specify "expo.name" in app.json / app.config.js.',
    }
  );

  log.newLine();

  return result.name;
}

/**
 * Merge two gitignore files together and add a generated header.
 *
 * @param targetGitIgnorePath
 * @param sourceGitIgnorePath
 */
export function mergeGitIgnoreFiles(
  targetGitIgnorePath: string,
  sourceGitIgnorePath: string
): string | null {
  if (!fse.existsSync(targetGitIgnorePath)) {
    // No gitignore in the project already, no need to merge anything into anything. I guess they
    // are not using git :O
    return null;
  }

  if (!fse.existsSync(sourceGitIgnorePath)) {
    // Maybe we don't have a gitignore in the template project
    return null;
  }

  const targetGitIgnore = fse.readFileSync(targetGitIgnorePath).toString();
  const sourceGitIgnore = fse.readFileSync(sourceGitIgnorePath).toString();
  const merged = mergeGitIgnoreContents(targetGitIgnore, sourceGitIgnore);
  fse.writeFileSync(targetGitIgnorePath, merged);

  return merged;
}

/**
 * Merge the contents of two gitignores together and add a generated header.
 *
 * @param targetGitIgnore contents of the existing gitignore
 * @param sourceGitIgnore contents of the extra gitignore
 */
function mergeGitIgnoreContents(targetGitIgnore: string, sourceGitIgnore: string): string {
  // TODO(Bacon): Add version this section with a tag (expo-cli@x.x.x)
  return `${targetGitIgnore}
# The following contents were automatically generated by expo-cli during eject
# ----------------------------------------------------------------------------

${sourceGitIgnore}`;
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
  const packagesToWarn: string[] = Object.keys(pkg.dependencies).filter(
    pkgName => pkgName in pkgsWithExtraSetup
  );

  if (packagesToWarn.length === 0) {
    return;
  }

  log.newLine();
  const warnAdditionalSetupStep = logNewSection(
    'Checking if any additional setup steps are required for installed SDK packages.'
  );

  const plural = packagesToWarn.length > 1;

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

/**
 * Returns true if the input string matches the default expo main field.
 *
 * - ./node_modules/expo/AppEntry
 * - ./node_modules/expo/AppEntry.js
 * - node_modules/expo/AppEntry.js
 * - expo/AppEntry.js
 * - expo/AppEntry
 *
 * @param input package.json main field
 */
export function isPkgMainExpoAppEntry(input?: string): boolean {
  const main = input || '';
  if (main.startsWith('./')) {
    return main.includes('node_modules/expo/AppEntry');
  }
  return main.includes('expo/AppEntry');
}
