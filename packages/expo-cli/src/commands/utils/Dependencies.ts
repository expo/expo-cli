import { ExpoConfig, PackageJSONConfig, projectHasModule } from '@expo/config';
import JsonFile from '@expo/json-file';
import { Versions } from '@expo/xdl';
import chalk from 'chalk';
import intersection from 'lodash/intersection';
import semver from 'semver';

import log from '../../log';

/**
 * Returns a promise that will be resolved with a list of dependencies which do
 * not match the expected versions for the projects current SDK version.
 *
 * @param projectDir
 * @param exp
 * @param pkg
 * @returns A list of incompatible dependencies
 */

export async function listIncompatibleDependencies(
  projectDir: string,
  exp: ExpoConfig,
  pkg: PackageJSONConfig
): Promise<{ moduleName: string; expectedRange: string; actualRange: string }[]> {
  if (!Versions.gteSdkVersion(exp, '33.0.0')) {
    return [];
  }

  const bundleNativeModulesPath = projectHasModule(
    'expo/bundledNativeModules.json',
    projectDir,
    exp
  );
  if (!bundleNativeModulesPath) {
    log.warn(
      `Your project is in SDK version >= 33.0.0, but the ${chalk.underline(
        'expo'
      )} package version seems to be older.`
    );
    return [];
  }

  const bundledNativeModules = await JsonFile.readAsync(bundleNativeModulesPath);
  const bundledNativeModulesNames = Object.keys(bundledNativeModules);
  const projectDependencies = Object.keys(pkg.dependencies || []);

  const modulesToCheck = intersection(bundledNativeModulesNames, projectDependencies);
  const incorrectDeps = [];
  for (const moduleName of modulesToCheck) {
    const expectedRange = bundledNativeModules[moduleName];
    const actualRange = pkg.dependencies[moduleName];
    if (
      (semver.valid(actualRange) || semver.validRange(actualRange)) &&
      typeof expectedRange === 'string' &&
      !semver.intersects(expectedRange, actualRange)
    ) {
      incorrectDeps.push({
        moduleName,
        expectedRange,
        actualRange,
      });
    }
  }
  if (incorrectDeps.length > 0) {
    log.warn(
      "Some of your project's dependencies are not compatible with currently installed expo package version:"
    );
    incorrectDeps.forEach(({ moduleName, expectedRange, actualRange }) => {
      log.warn(
        ` - ${chalk.underline(moduleName)} - expected version range: ${chalk.underline(
          expectedRange
        )} - actual version installed: ${chalk.underline(actualRange)}`
      );
    });
    log.warn(
      'Your project may not work correctly until you install the correct versions of the packages.\n' +
        `To install the correct versions of these packages, please run: ${chalk.inverse(
          'expo install [package-name ...]'
        )}`
    );
  }

  return incorrectDeps;
}
