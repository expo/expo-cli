import { ExpoConfig, PackageJSONConfig } from '@expo/config';
import JsonFile from '@expo/json-file';
import chalk from 'chalk';
import intersection from 'lodash/intersection';
import resolveFrom from 'resolve-from';
import semver from 'semver';
import { Versions } from 'xdl';

import Log from '../../log';

export async function validateDependenciesVersionsAsync(
  projectRoot: string,
  exp: ExpoConfig,
  pkg: PackageJSONConfig
): Promise<void> {
  if (!Versions.gteSdkVersion(exp, '33.0.0')) {
    return;
  }

  const bundleNativeModulesPath = resolveFrom.silent(projectRoot, 'expo/bundledNativeModules.json');
  if (!bundleNativeModulesPath) {
    Log.warn(
      `Your project is in SDK version >= 33.0.0, but the ${chalk.underline(
        'expo'
      )} package version seems to be older.`
    );
    return;
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
    Log.warn('Some dependencies are incompatible with the installed expo package version:');
    incorrectDeps.forEach(({ moduleName, expectedRange, actualRange }) => {
      Log.warn(
        ` - ${chalk.underline(moduleName)} - expected version range: ${chalk.underline(
          expectedRange
        )} - actual version installed: ${chalk.underline(actualRange)}`
      );
    });
    Log.warn(
      'Your project may not work correctly until you install the correct versions of the packages.\n' +
        `To install the correct versions of these packages, please run: ${chalk.inverse(
          'expo install [package-name ...]'
        )}`
    );
  }
}
