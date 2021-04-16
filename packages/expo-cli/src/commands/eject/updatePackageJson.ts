import { getPackageJson, PackageJSONConfig } from '@expo/config';
import chalk from 'chalk';
import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';

import Log from '../../log';
import * as CreateApp from '../utils/CreateApp';
import { isModuleSymlinked } from '../utils/isModuleSymlinked';

export type DependenciesMap = { [key: string]: string | number };

export type DependenciesModificationResults = {
  hasNewDependencies: boolean;
  hasNewDevDependencies: boolean;
};

export async function updatePackageJSONAsync({
  projectRoot,
  tempDir,
  pkg,
  skipDependencyUpdate,
}: {
  projectRoot: string;
  tempDir: string;
  pkg: PackageJSONConfig;
  skipDependencyUpdate?: string[];
}): Promise<DependenciesModificationResults> {
  // NOTE(brentvatne): Removing spaces between steps for now, add back when
  // there is some additional context for steps
  const updatingPackageJsonStep = CreateApp.logNewSection(
    'Updating your package.json scripts, dependencies, and main file'
  );

  updatePackageJSONScripts({ pkg });

  const results = updatePackageJSONDependencies({
    projectRoot,
    pkg,
    tempDir,
    skipDependencyUpdate,
  });

  const removedPkgMain = updatePackageJSONEntryPoint({ pkg });
  await fs.writeFile(
    path.resolve(projectRoot, 'package.json'),
    // Add new line to match the format of running yarn.
    // This prevents the `package.json` from changing when running `prebuild --no-install` multiple times.
    JSON.stringify(pkg, null, 2) + '\n'
  );

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
export function updatePackageJSONDependencies({
  projectRoot,
  tempDir,
  pkg,
  skipDependencyUpdate = [],
}: {
  projectRoot: string;
  tempDir: string;
  pkg: PackageJSONConfig;
  skipDependencyUpdate?: string[];
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

  const symlinkedPackages: string[] = [];

  for (const dependenciesKey of requiredDependencies) {
    if (
      // If the local package.json defined the dependency that we want to overwrite...
      pkg.dependencies?.[dependenciesKey]
    ) {
      if (
        // Then ensure it isn't symlinked (i.e. the user has a custom version in their yarn workspace).
        isModuleSymlinked({ projectRoot, moduleId: dependenciesKey, isSilent: true })
      ) {
        // If the package is in the project's package.json and it's symlinked, then skip overwriting it.
        symlinkedPackages.push(dependenciesKey);
        continue;
      }
      if (skipDependencyUpdate.includes(dependenciesKey)) {
        continue;
      }
    }
    combinedDependencies[dependenciesKey] = defaultDependencies[dependenciesKey];
  }

  if (symlinkedPackages.length) {
    Log.log(
      `\u203A Using symlinked ${symlinkedPackages
        .map(pkg => chalk.bold(pkg))
        .join(', ')} instead of recommended version(s).`
    );
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
export function createDependenciesMap(dependencies: any): DependenciesMap {
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

/**
 * Update package.json scripts - `npm start` should default to `react-native
 * start` rather than `expo start` after ejecting, for example.
 */
function updatePackageJSONScripts({ pkg }: { pkg: PackageJSONConfig }) {
  if (!pkg.scripts) {
    pkg.scripts = {};
  }
  if (!pkg.scripts.start?.includes('--dev-client')) {
    pkg.scripts.start = 'react-native start';
  }
  if (!pkg.scripts.android?.includes('run')) {
    pkg.scripts.android = 'react-native run-android';
  }
  if (!pkg.scripts.ios?.includes('run')) {
    pkg.scripts.ios = 'react-native run-ios';
  }
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

export function createFileHash(contents: string): string {
  // this doesn't need to be secure, the shorter the better.
  return crypto.createHash('sha1').update(contents).digest('hex');
}

export function shouldDeleteMainField(main?: any): boolean {
  if (!main || !isPkgMainExpoAppEntry(main)) {
    return false;
  }

  return !main?.startsWith('index.');
}
