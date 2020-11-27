import { ExpoConfig, getConfig, PackageJSONConfig } from '@expo/config';
import { WarningAggregator } from '@expo/config-plugins';
import { getBareExtensions, getFileWithExtensions } from '@expo/config/paths';
import JsonFile, { JSONObject } from '@expo/json-file';
import { Exp } from '@expo/xdl';
import chalk from 'chalk';
import crypto from 'crypto';
import fs from 'fs-extra';
import npmPackageArg from 'npm-package-arg';
import pacote from 'pacote';
import path from 'path';
import semver from 'semver';
import temporary from 'tempy';
import terminalLink from 'terminal-link';

import CommandError, { SilentError } from '../../CommandError';
import log from '../../log';
import configureAndroidProjectAsync from '../apply/configureAndroidProjectAsync';
import configureIOSProjectAsync from '../apply/configureIOSProjectAsync';
import * as CreateApp from '../utils/CreateApp';
import * as GitIgnore from '../utils/GitIgnore';
import { usesOldExpoUpdatesAsync } from '../utils/ProjectUtils';
import { learnMore } from '../utils/TerminalLink';
import { logConfigWarningsAndroid, logConfigWarningsIOS } from '../utils/logConfigWarnings';
import maybeBailOnGitStatusAsync from '../utils/maybeBailOnGitStatusAsync';
import { getOrPromptForBundleIdentifier, getOrPromptForPackage } from './ConfigValidation';

type DependenciesMap = { [key: string]: string | number };
type PlatformsArray = ('ios' | 'android')[];

export type EjectAsyncOptions = {
  verbose?: boolean;
  force?: boolean;
  install?: boolean;
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
export async function ejectAsync(
  projectRoot: string,
  options: EjectAsyncOptions = {}
): Promise<void> {
  if (await maybeBailOnGitStatusAsync()) return;

  const platforms: PlatformsArray = ['android'];

  // Skip ejecting for iOS on Windows
  if (process.platform !== 'win32') {
    platforms.push('ios');
  }

  const { exp, pkg } = await ensureConfigAsync(projectRoot);
  const tempDir = temporary.directory();

  if (!platforms.includes('ios')) {
    log.warn(
      `⚠️  Skipping generating the iOS native project files. Run ${chalk.bold(
        'expo eject'
      )} again from macOS or Linux to generate the iOS project.`
    );
    log.newLine();
  }

  const { hasNewProjectFiles, needsPodInstall } = await createNativeProjectsFromTemplateAsync({
    projectRoot,
    exp,
    pkg,
    tempDir,
    platforms,
  });
  // Set this to true when we can detect that the user is running eject to sync new changes rather than ejecting to bare.
  // This will be used to prevent the node modules from being nuked every time.
  const isSyncing = !hasNewProjectFiles;

  // Install node modules
  const shouldInstall = options?.install !== false;

  const packageManager = CreateApp.resolvePackageManager({
    install: shouldInstall,
    npm: options?.packageManager === 'npm',
    yarn: options?.packageManager === 'yarn',
  });

  if (shouldInstall) {
    await installNodeDependenciesAsync(projectRoot, packageManager, { clean: !isSyncing });
  }

  // Apply Expo config to native projects
  if (platforms.includes('ios')) {
    await configureIOSStepAsync(projectRoot);
  }

  if (platforms.includes('android')) {
    await configureAndroidStepAsync(projectRoot);
  }

  // Install CocoaPods
  let podsInstalled: boolean = false;
  // err towards running pod install less because it's slow and users can easily run npx pod-install afterwards.
  if (platforms.includes('ios') && shouldInstall && needsPodInstall) {
    podsInstalled = await CreateApp.installCocoaPodsAsync(projectRoot);
  } else {
    log.debug('Skipped pod install');
  }

  await warnIfDependenciesRequireAdditionalSetupAsync(pkg, options);

  log.newLine();
  log.nested(`➡️  ${chalk.bold('Next steps')}`);

  if (WarningAggregator.hasWarningsIOS() || WarningAggregator.hasWarningsAndroid()) {
    log.nested(
      `- 👆 Review the logs above and look for any warnings (⚠️ ) that might need follow-up.`
    );
  }

  // Log a warning about needing to install node modules
  if (options?.install === false) {
    const installCmd = packageManager === 'npm' ? 'npm install' : 'yarn';
    log.nested(`- ⚠️  Install node modules: ${log.chalk.bold(installCmd)}`);
  }
  if (!podsInstalled) {
    log.nested(
      `- 🍫 When CocoaPods is installed, initialize the project workspace: ${chalk.bold(
        'npx pod-install'
      )}`
    );
  }
  log.nested(
    `- 💡 You may want to run ${chalk.bold(
      'npx @react-native-community/cli doctor'
    )} to help install any tools that your app may need to run your native projects.`
  );
  log.nested(
    `- 🔑 Download your Android keystore (if you're not sure if you need to, just run the command and see): ${chalk.bold(
      'expo fetch:android:keystore'
    )}`
  );

  if (exp.hasOwnProperty('assetBundlePatterns')) {
    log.nested(
      `- 📁 The property ${chalk.bold(
        `assetBundlePatterns`
      )} does not have the same effect in the bare workflow. ${log.chalk.dim(
        learnMore('https://docs.expo.io/bare/updating-your-app/#embedding-assets')
      )}`
    );
  }

  if (await usesOldExpoUpdatesAsync(projectRoot)) {
    log.nested(
      `- 🚀 ${
        (terminalLink(
          'expo-updates',
          'https://github.com/expo/expo/blob/master/packages/expo-updates/README.md'
        ),
        {
          fallback: (text: string) => text,
        })
      } has been configured in your project. Before you do a release build, make sure you run ${chalk.bold(
        'expo publish'
      )}. ${log.chalk.dim(learnMore('https://expo.fyi/release-builds-with-expo-updates'))}`
    );
  }

  if (hasNewProjectFiles) {
    log.newLine();
    log.nested(`☑️  ${chalk.bold('When you are ready to run your project')}`);
    log.nested(
      'To compile and run your project in development, execute one of the following commands:'
    );

    if (platforms.includes('ios')) {
      log.nested(`- ${chalk.bold(packageManager === 'npm' ? 'npm run ios' : 'yarn ios')}`);
    }

    if (platforms.includes('android')) {
      log.nested(`- ${chalk.bold(packageManager === 'npm' ? 'npm run android' : 'yarn android')}`);
    }

    log.nested(`- ${chalk.bold(packageManager === 'npm' ? 'npm run web' : 'yarn web')}`);
  }
}

async function configureIOSStepAsync(projectRoot: string) {
  const applyingIOSConfigStep = CreateApp.logNewSection('iOS config syncing');
  await configureIOSProjectAsync(projectRoot);
  if (WarningAggregator.hasWarningsIOS()) {
    applyingIOSConfigStep.stopAndPersist({
      symbol: '⚠️ ',
      text: chalk.red('iOS config synced with warnings that should be fixed:'),
    });
    logConfigWarningsIOS();
  } else {
    applyingIOSConfigStep.succeed('iOS config synced');
  }
}

/**
 * Wraps PackageManager to install node modules and adds CLI logs.
 *
 * @param projectRoot
 */
async function installNodeDependenciesAsync(
  projectRoot: string,
  packageManager: 'yarn' | 'npm',
  { clean = true }: { clean: boolean }
) {
  if (clean) {
    // This step can take a couple seconds, if the installation logs are enabled (with EXPO_DEBUG) then it
    // ends up looking odd to see "Installing JavaScript dependencies" for ~5 seconds before the logs start showing up.
    const cleanJsDepsStep = CreateApp.logNewSection('Cleaning JavaScript dependencies.');
    // nuke the node modules
    // TODO: this is substantially slower, we should find a better alternative to ensuring the modules are installed.
    await fs.remove('node_modules');
    cleanJsDepsStep.succeed('Cleaned JavaScript dependencies.');
  }

  const installJsDepsStep = CreateApp.logNewSection('Installing JavaScript dependencies.');

  try {
    await CreateApp.installNodeDependenciesAsync(projectRoot, packageManager);
    installJsDepsStep.succeed('Installed JavaScript dependencies.');
  } catch {
    const message = `Something went wrong installing JavaScript dependencies, check your ${packageManager} logfile or run ${chalk.bold(
      `${packageManager} install`
    )} again manually.`;
    installJsDepsStep.fail(chalk.red(message));
    // TODO: actually show the error message from the package manager! :O
    throw new SilentError(message);
  }
}

async function configureAndroidStepAsync(projectRoot: string) {
  const applyingAndroidConfigStep = CreateApp.logNewSection('Android config syncing');
  await configureAndroidProjectAsync(projectRoot);
  if (WarningAggregator.hasWarningsAndroid()) {
    applyingAndroidConfigStep.stopAndPersist({
      symbol: '⚠️ ',
      text: chalk.red('Android config synced with warnings that should be fixed:'),
    });
    logConfigWarningsAndroid();
  } else {
    applyingAndroidConfigStep.succeed('Android config synced');
  }
}

function copyPathsFromTemplate(
  projectRoot: string,
  templatePath: string,
  paths: string[]
): [string[], string[]] {
  const copiedPaths = [];
  const skippedPaths = [];
  for (const targetPath of paths) {
    const projectPath = path.join(projectRoot, targetPath);
    if (!fs.existsSync(projectPath)) {
      copiedPaths.push(targetPath);
      fs.copySync(path.join(templatePath, targetPath), projectPath);
    } else {
      skippedPaths.push(targetPath);
    }
  }
  return [copiedPaths, skippedPaths];
}

async function ensureConfigAsync(
  projectRoot: string
): Promise<{ exp: ExpoConfig; pkg: PackageJSONConfig }> {
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
        // TODO: Write to app.config.json because it's easier to convert to a js config file.
        path.join(projectRoot, 'app.json'),
        { expo: (config.exp as unknown) as JSONObject },
        { json5: false }
      );
    }
  } catch (error) {
    // TODO(Bacon): Currently this is already handled in the command
    log.addNewLineIfNone();
    throw new CommandError(`${error.message}\n`);
  }

  // Prompt for the Android package first because it's more strict than the bundle identifier
  // this means you'll have a better chance at matching the bundle identifier with the package name.
  await getOrPromptForPackage(projectRoot);
  await getOrPromptForBundleIdentifier(projectRoot);

  if (exp.entryPoint) {
    delete exp.entryPoint;
    log(`- expo.entryPoint is not needed and has been removed.`);
  }

  return { exp, pkg };
}

function createFileHash(contents: string): string {
  // this doesn't need to be secure, the shorter the better.
  return crypto.createHash('sha1').update(contents).digest('hex');
}

function writeMetroConfig({
  projectRoot,
  pkg,
  tempDir,
}: {
  projectRoot: string;
  pkg: PackageJSONConfig;
  tempDir: string;
}) {
  /**
   * Add metro config, or warn if metro config already exists. The developer will need to add the
   * hashAssetFiles plugin manually.
   */

  const updatingMetroConfigStep = CreateApp.logNewSection('Adding Metro bundler configuration');

  try {
    const sourceConfigPath = path.join(tempDir, 'metro.config.js');
    const targetConfigPath = path.join(projectRoot, 'metro.config.js');
    const targetConfigPathExists = fs.existsSync(targetConfigPath);
    if (targetConfigPathExists) {
      // Prevent re-runs from throwing an error if the metro config hasn't been modified.
      const contents = createFileHash(fs.readFileSync(targetConfigPath, 'utf8'));
      const targetContents = createFileHash(fs.readFileSync(sourceConfigPath, 'utf8'));
      if (contents !== targetContents) {
        throw new Error('Existing Metro configuration found; not overwriting.');
      } else {
        // Nothing to change, hide the step and exit.
        updatingMetroConfigStep.stop();
        updatingMetroConfigStep.clear();
        return;
      }
    } else if (
      fs.existsSync(path.join(projectRoot, 'metro.config.json')) ||
      pkg.metro ||
      fs.existsSync(path.join(projectRoot, 'rn-cli.config.js'))
    ) {
      throw new Error('Existing Metro configuration found; not overwriting.');
    }

    fs.copySync(sourceConfigPath, targetConfigPath);
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
      )} plugin to your Metro configuration. ${log.chalk.dim(
        learnMore('https://docs.expo.io/bare/installing-updates/')
      )}`
    );
    log.newLine();
  }
}

async function validateBareTemplateExistsAsync(sdkVersion: string): Promise<npmPackageArg.Result> {
  // Validate that the template exists
  const sdkMajorVersionNumber = semver.major(sdkVersion);
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

  return templateSpec;
}

type DependenciesModificationResults = {
  hasNewDependencies: boolean;
  hasNewDevDependencies: boolean;
};

async function updatePackageJSONAsync({
  projectRoot,
  tempDir,
  pkg,
}: {
  projectRoot: string;
  tempDir: string;
  pkg: PackageJSONConfig;
}): Promise<DependenciesModificationResults> {
  let defaultDependencies: any = {};
  let defaultDevDependencies: any = {};
  const { dependencies, devDependencies } = JsonFile.read(path.join(tempDir, 'package.json'));
  defaultDependencies = createDependenciesMap(dependencies);
  defaultDevDependencies = createDependenciesMap(devDependencies);
  /**
   * Update package.json scripts - `npm start` should default to `react-native
   * start` rather than `expo start` after ejecting, for example.
   */
  // NOTE(brentvatne): Removing spaces between steps for now, add back when
  // there is some additional context for steps
  const updatingPackageJsonStep = CreateApp.logNewSection(
    'Updating your package.json scripts, dependencies, and main file'
  );
  if (!pkg.scripts) {
    pkg.scripts = {};
  }
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

  const requiredDependencies = ['react', 'react-native-unimodules', 'react-native', 'expo-updates'];

  for (const dependenciesKey of requiredDependencies) {
    combinedDependencies[dependenciesKey] = defaultDependencies[dependenciesKey];
  }
  const combinedDevDependencies: DependenciesMap = createDependenciesMap({
    ...defaultDevDependencies,
    ...pkg.devDependencies,
  });

  // Only change the dependencies if the normalized hash changes, this helps to reduce meaningless changes.
  const hasNewDependencies =
    hashForDependencyMap(pkg.dependencies) !== hashForDependencyMap(combinedDependencies);
  const hasNewDevDependencies =
    hashForDependencyMap(pkg.devDependencies) !== hashForDependencyMap(combinedDevDependencies);
  // Save the dependencies
  if (hasNewDependencies) {
    pkg.dependencies = combinedDependencies;
  }
  if (hasNewDevDependencies) {
    pkg.devDependencies = combinedDevDependencies;
  }

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
  if (shouldDeleteMainField(pkg.main)) {
    // Save the custom
    removedPkgMain = pkg.main;
    delete pkg.main;
  }
  await fs.writeFile(path.resolve(projectRoot, 'package.json'), JSON.stringify(pkg, null, 2));

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

  return {
    hasNewDependencies,
    hasNewDevDependencies,
  };
}

export function resolveBareEntryFile(projectRoot: string, main: any) {
  // expo app entry is not needed for bare projects.
  if (isPkgMainExpoAppEntry(main)) return null;
  // Look at the `package.json`s `main` field for the main file.
  const resolvedMainField = main ?? './index';
  // Get a list of possible extensions for the main file.
  const extensions = getBareExtensions(['ios', 'android']);
  // Testing the main field against all of the provided extensions - for legacy reasons we can't use node module resolution as the package.json allows you to pass in a file without a relative path and expect it as a relative path.
  return getFileWithExtensions(projectRoot, resolvedMainField, extensions);
}

export function shouldDeleteMainField(main?: any): boolean {
  if (!main || !isPkgMainExpoAppEntry(main)) {
    return false;
  }

  return !main?.startsWith('index.');
}

function normalizeDependencyMap(deps: DependenciesMap): string[] {
  return Object.keys(deps)
    .map(dependency => `${dependency}@${deps[dependency]}`)
    .sort();
}

export function hashForDependencyMap(deps: DependenciesMap): string {
  const depsList = normalizeDependencyMap(deps);
  const depsString = depsList.join('\n');
  return createFileHash(depsString);
}

export function getTargetPaths(
  projectRoot: string,
  pkg: PackageJSONConfig,
  platforms: PlatformsArray
) {
  const targetPaths: string[] = [...platforms];

  const bareEntryFile = resolveBareEntryFile(projectRoot, pkg.main);
  // Only create index.js if we cannot resolve the existing entry point (after replacing the expo entry).
  if (!bareEntryFile) {
    targetPaths.push('index.js');
  }

  return targetPaths;
}

/**
 * Extract the template and copy the ios and android directories over to the project directory.
 *
 * @param force should create native projects even if they already exist.
 * @return `true` if any project files were created.
 */
async function cloneNativeDirectoriesAsync({
  projectRoot,
  tempDir,
  exp,
  pkg,
  platforms,
}: {
  projectRoot: string;
  tempDir: string;
  exp: Pick<ExpoConfig, 'name' | 'sdkVersion'>;
  pkg: PackageJSONConfig;
  platforms: PlatformsArray;
}): Promise<string[]> {
  const templateSpec = await validateBareTemplateExistsAsync(exp.sdkVersion!);

  // NOTE(brentvatne): Removing spaces between steps for now, add back when
  // there is some additional context for steps
  const creatingNativeProjectStep = CreateApp.logNewSection(
    'Creating native project directories (./ios and ./android) and updating .gitignore'
  );

  const targetPaths = getTargetPaths(projectRoot, pkg, platforms);

  let copiedPaths: string[] = [];
  let skippedPaths: string[] = [];
  try {
    await Exp.extractTemplateAppAsync(templateSpec, tempDir, exp);
    [copiedPaths, skippedPaths] = copyPathsFromTemplate(projectRoot, tempDir, targetPaths);
    const results = GitIgnore.mergeGitIgnorePaths(
      path.join(projectRoot, '.gitignore'),
      path.join(tempDir, '.gitignore')
    );

    let message = `Created native project${platforms.length > 1 ? 's' : ''}`;

    if (skippedPaths.length) {
      message += log.chalk.dim(
        ` | ${skippedPaths.map(path => log.chalk.bold(`/${path}`)).join(', ')} already created`
      );
    }
    if (!results?.didMerge) {
      message += log.chalk.dim(` | gitignore already synced`);
    } else if (results.didMerge && results.didClear) {
      message += log.chalk.dim(` | synced gitignore`);
    }
    creatingNativeProjectStep.succeed(message);
  } catch (e) {
    log.error(e.message);
    creatingNativeProjectStep.fail(
      'Failed to create the native project - see the output above for more information.'
    );
    log(
      chalk.yellow(
        'You may want to delete the `./ios` and/or `./android` directories before running eject again.'
      )
    );
    throw new SilentError(e);
  }

  return copiedPaths;
}

/**
 *
 * @param projectRoot
 * @param tempDir
 *
 * @return `true` if the project is ejecting, and `false` if it's syncing.
 */
async function createNativeProjectsFromTemplateAsync({
  projectRoot,
  exp,
  pkg,
  tempDir,
  platforms,
}: {
  projectRoot: string;
  exp: ExpoConfig;
  pkg: PackageJSONConfig;
  tempDir: string;
  platforms: PlatformsArray;
}): Promise<
  { hasNewProjectFiles: boolean; needsPodInstall: boolean } & DependenciesModificationResults
> {
  const copiedPaths = await cloneNativeDirectoriesAsync({
    projectRoot,
    tempDir,
    exp,
    pkg,
    platforms,
  });

  writeMetroConfig({ projectRoot, pkg, tempDir });

  const depsResults = await updatePackageJSONAsync({ projectRoot, tempDir, pkg });

  return {
    hasNewProjectFiles: !!copiedPaths.length,
    // If the iOS folder changes or new packages are added, we should rerun pod install.
    needsPodInstall:
      copiedPaths.includes('ios') ||
      depsResults.hasNewDependencies ||
      depsResults.hasNewDevDependencies,
    ...depsResults,
  };
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

/**
 * Some packages are not configured automatically on eject and may require
 * users to add some code, eg: to their AppDelegate.
 */
async function warnIfDependenciesRequireAdditionalSetupAsync(
  pkg: PackageJSONConfig,
  options?: EjectAsyncOptions
): Promise<void> {
  const expoPackagesWithExtraSetup = [
    'expo-camera',
    'expo-image-picker',
    'expo-av',
    'expo-background-fetch',
    'expo-barcode-scanner',
    'expo-brightness',
    'expo-calendar',
    'expo-contacts',
    'expo-file-system',
    'expo-location',
    'expo-media-library',
    'expo-notifications',
    'expo-screen-orientation',
    'expo-sensors',
    'expo-task-manager',
  ].reduce(
    (prev, curr) => ({
      ...prev,
      [curr]: `https://github.com/expo/expo/tree/master/packages/${curr}`,
    }),
    {}
  );
  const pkgsWithExtraSetup: Record<string, string> = {
    ...expoPackagesWithExtraSetup,
    'lottie-react-native': 'https://github.com/react-native-community/lottie-react-native',
    'expo-constants': `${chalk.bold(
      'Constants.manifest'
    )} is not available in the bare workflow. You should replace it with ${chalk.bold(
      'Updates.manifest'
    )}. ${log.chalk.dim(
      learnMore('https://docs.expo.io/versions/latest/sdk/updates/#updatesmanifest')
    )}`,
  };
  const packagesToWarn: string[] = Object.keys(pkg.dependencies).filter(
    pkgName => pkgName in pkgsWithExtraSetup
  );

  if (packagesToWarn.length === 0) {
    return;
  }

  log.newLine();
  const warnAdditionalSetupStep = CreateApp.logNewSection(
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
