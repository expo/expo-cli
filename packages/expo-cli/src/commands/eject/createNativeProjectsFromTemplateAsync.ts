import { ExpoConfig, PackageJSONConfig } from '@expo/config';
import { ModPlatform } from '@expo/config-plugins';
import { getBareExtensions, getFileWithExtensions } from '@expo/config/paths';
import JsonFile, { JSONObject } from '@expo/json-file';
import chalk from 'chalk';
import crypto from 'crypto';
import fs from 'fs-extra';
import npmPackageArg from 'npm-package-arg';
import pacote from 'pacote';
import path from 'path';
import semver from 'semver';

import { SilentError } from '../../CommandError';
import Log from '../../log';
import { extractTemplateAppAsync } from '../../utils/extractTemplateAppAsync';
import * as CreateApp from '../utils/CreateApp';
import * as GitIgnore from '../utils/GitIgnore';
import { learnMore } from '../utils/TerminalLink';

type DependenciesMap = { [key: string]: string | number };

/**
 *
 * @param projectRoot
 * @param tempDir
 *
 * @return `true` if the project is ejecting, and `false` if it's syncing.
 */
export async function createNativeProjectsFromTemplateAsync({
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
  platforms: ModPlatform[];
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
  platforms: ModPlatform[];
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
    await extractTemplateAppAsync(templateSpec, tempDir, exp);
    [copiedPaths, skippedPaths] = copyPathsFromTemplate(projectRoot, tempDir, targetPaths);
    const results = GitIgnore.mergeGitIgnorePaths(
      path.join(projectRoot, '.gitignore'),
      path.join(tempDir, '.gitignore')
    );

    let message = `Created native project${platforms.length > 1 ? 's' : ''}`;

    if (skippedPaths.length) {
      message += Log.chalk.dim(
        ` | ${skippedPaths.map(path => Log.chalk.bold(`/${path}`)).join(', ')} already created`
      );
    }
    if (!results?.didMerge) {
      message += Log.chalk.dim(` | gitignore already synced`);
    } else if (results.didMerge && results.didClear) {
      message += Log.chalk.dim(` | synced gitignore`);
    }
    creatingNativeProjectStep.succeed(message);
  } catch (e) {
    Log.error(e.message);
    creatingNativeProjectStep.fail(
      'Failed to create the native project - see the output above for more information.'
    );
    Log.log(
      chalk.yellow(
        'You may want to delete the `./ios` and/or `./android` directories before running eject again.'
      )
    );
    throw new SilentError(e);
  }

  return copiedPaths;
}

async function updatePackageJSONAsync({
  projectRoot,
  tempDir,
  pkg,
}: {
  projectRoot: string;
  tempDir: string;
  pkg: PackageJSONConfig;
}): Promise<DependenciesModificationResults> {
  // NOTE(brentvatne): Removing spaces between steps for now, add back when
  // there is some additional context for steps
  const updatingPackageJsonStep = CreateApp.logNewSection(
    'Updating your package.json scripts, dependencies, and main file'
  );

  updatePackageJSONScripts({ pkg });

  const results = updatePackageJSONDependencies({ pkg, tempDir });

  const removedPkgMain = updatePackageJSONEntryPoint({ pkg });
  await fs.writeFile(path.resolve(projectRoot, 'package.json'), JSON.stringify(pkg, null, 2));

  updatingPackageJsonStep.succeed(
    'Updated package.json and added index.js entry point for iOS and Android.'
  );
  if (removedPkgMain) {
    Log.log(
      `\u203A Removed ${chalk.bold(
        `"main": "${removedPkgMain}"`
      )} from package.json because we recommend using index.js as main instead.`
    );
    Log.newLine();
  }

  return results;
}

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
function updatePackageJSONDependencies({
  tempDir,
  pkg,
}: {
  tempDir: string;
  pkg: PackageJSONConfig;
}): DependenciesModificationResults {
  if (!pkg.devDependencies) {
    pkg.devDependencies = {};
  }
  const { dependencies, devDependencies } = getPackageJson(tempDir);
  const defaultDependencies = createDependenciesMap(dependencies);
  const defaultDevDependencies = createDependenciesMap(devDependencies);

  const combinedDependencies: DependenciesMap = createDependenciesMap({
    ...defaultDependencies,
    ...pkg.dependencies,
  });

  const requiredDependencies = ['react', 'react-native-unimodules', 'react-native', 'expo-updates'];

  for (const dependenciesKey of requiredDependencies) {
    // Only overwrite the react-native version if it's an Expo fork.
    if (dependenciesKey === 'react-native' && pkg.dependencies?.[dependenciesKey]) {
      const dependencyVersion = pkg.dependencies[dependenciesKey];
      if (!dependencyVersion.includes('github.com/expo/react-native')) {
        continue;
      }
    }
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
    // Use Object.assign to preserve the original order of dependencies, this makes it easier to see what changed in the git diff.
    pkg.dependencies = Object.assign(pkg.dependencies, combinedDependencies);
  }
  if (hasNewDevDependencies) {
    // Same as with dependencies
    pkg.devDependencies = Object.assign(pkg.devDependencies, combinedDevDependencies);
  }

  return {
    hasNewDependencies,
    hasNewDevDependencies,
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
  } else if (!dependencies) {
    return {};
  }

  const outputMap: DependenciesMap = {};

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

function getPackageJson(projectRoot: string): JSONObject {
  return JsonFile.read(path.join(projectRoot, 'package.json'));
}

/**
 * Update package.json scripts - `npm start` should default to `react-native
 * start` rather than `expo start` after ejecting, for example.
 */
function updatePackageJSONScripts({ pkg }: { pkg: PackageJSONConfig }) {
  if (!pkg.scripts) {
    pkg.scripts = {};
  }
  pkg.scripts.start = 'react-native start';
  pkg.scripts.ios = 'react-native run-ios';
  pkg.scripts.android = 'react-native run-android';
}

/**
 * Add new app entry points
 */
function updatePackageJSONEntryPoint({ pkg }: { pkg: PackageJSONConfig }): boolean {
  let removedPkgMain = false;
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

  return removedPkgMain;
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
      text: chalk.yellow('Metro bundler configuration not applied:'),
    });
    Log.nested(`\u203A ${e.message}`);
    Log.nested(
      `\u203A You will need to add the ${chalk.bold(
        'hashAssetFiles'
      )} plugin to your Metro configuration.\n  ${Log.chalk.dim(
        learnMore('https://docs.expo.io/bare/installing-updates/')
      )}`
    );
    Log.newLine();
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

export function getTargetPaths(
  projectRoot: string,
  pkg: PackageJSONConfig,
  platforms: ModPlatform[]
) {
  const targetPaths: string[] = [...platforms];

  const bareEntryFile = resolveBareEntryFile(projectRoot, pkg.main);
  // Only create index.js if we cannot resolve the existing entry point (after replacing the expo entry).
  if (!bareEntryFile) {
    targetPaths.push('index.js');
  }

  return targetPaths;
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

function createFileHash(contents: string): string {
  // this doesn't need to be secure, the shorter the better.
  return crypto.createHash('sha1').update(contents).digest('hex');
}

export function shouldDeleteMainField(main?: any): boolean {
  if (!main || !isPkgMainExpoAppEntry(main)) {
    return false;
  }

  return !main?.startsWith('index.');
}
