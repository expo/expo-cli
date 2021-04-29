import { ExpoConfig, PackageJSONConfig } from '@expo/config';
import JsonFile from '@expo/json-file';
import chalk from 'chalk';
import intersection from 'lodash/intersection';
import nullthrows from 'nullthrows';
import resolveFrom from 'resolve-from';
import semver from 'semver';
import { Versions } from 'xdl';

import CommandError from '../../CommandError';
import Log from '../../log';
import { BundledNativeModules, getBundledNativeModulesAsync } from './bundledNativeModules';

export async function validateDependenciesVersionsAsync(
  projectRoot: string,
  exp: ExpoConfig,
  pkg: PackageJSONConfig
): Promise<boolean> {
  if (!Versions.gteSdkVersion(exp, '33.0.0')) {
    return false;
  }

  let bundledNativeModules: BundledNativeModules | null = null;
  try {
    bundledNativeModules = await getBundledNativeModulesAsync(
      projectRoot,
      // sdkVersion is defined here because we ran the >= 33.0.0 check before
      nullthrows(exp.sdkVersion)
    );
  } catch {
    Log.warn(
      `Your project is in SDK version >= 33.0.0, but the ${chalk.underline(
        'expo'
      )} package version seems to be older.`
    );
    return false;
  }

  const bundledNativeModulesNames = Object.keys(bundledNativeModules);
  const projectDependencies = Object.keys(pkg.dependencies || []);

  const packagesToCheck = intersection(bundledNativeModulesNames, projectDependencies);
  const incorrectDeps: {
    packageName: string;
    expectedVersionOrRange: string;
    actualVersion: string;
  }[] = [];

  const packageVersionsFromPackageJSON = await Promise.all(
    packagesToCheck.map(packageName => getPackageVersionAsync(projectRoot, packageName))
  );
  const packageVersions = packagesToCheck.reduce((acc, packageName, idx) => {
    acc[packageName] = packageVersionsFromPackageJSON[idx];
    return acc;
  }, {} as Record<string, string>);

  for (const packageName of packagesToCheck) {
    const expectedVersionOrRange = bundledNativeModules[packageName];
    const actualVersion = packageVersions[packageName];
    if (
      typeof expectedVersionOrRange === 'string' &&
      !semver.intersects(expectedVersionOrRange, actualVersion)
    ) {
      incorrectDeps.push({
        packageName,
        expectedVersionOrRange,
        actualVersion,
      });
    }
  }
  if (incorrectDeps.length > 0) {
    Log.warn('Some dependencies are incompatible with the installed expo package version:');
    incorrectDeps.forEach(({ packageName, expectedVersionOrRange, actualVersion }) => {
      Log.warn(
        ` - ${chalk.underline(packageName)} - expected version: ${chalk.underline(
          expectedVersionOrRange
        )} - actual version installed: ${chalk.underline(actualVersion)}`
      );
    });
    Log.warn(
      'Your project may not work correctly until you install the correct versions of the packages.\n' +
        `To install the correct versions of these packages, please run: ${chalk.inverse(
          'expo install [package-name ...]'
        )}`
    );
    return false;
  }
  return true;
}

async function getPackageVersionAsync(projectRoot: string, packageName: string): Promise<string> {
  const packageJsonPath = resolveFrom.silent(projectRoot, `${packageName}/package.json`);
  if (!packageJsonPath) {
    throw new CommandError(
      `"${packageName}" is added as a dependency in your project's package.json but it doesn't seem to be installed. Please run "yarn" or "npm install" to fix this issue.`
    );
  }
  const packageJson = await JsonFile.readAsync<BundledNativeModules>(packageJsonPath);
  return packageJson.version;
}
