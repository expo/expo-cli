import { getPackageJson, PackageJSONConfig } from '@expo/config';
import chalk from 'chalk';
import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';

import Log from '../../log';
import * as CreateApp from '../utils/CreateApp';

type DependenciesMap = { [key: string]: string | number };

export type DependenciesModificationResults = {
  hasNewDependencies: boolean;
  hasNewDevDependencies: boolean;
};

export async function updatePackageJSONAsync({
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
