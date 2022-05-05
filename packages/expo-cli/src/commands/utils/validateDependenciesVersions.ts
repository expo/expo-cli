import { ExpoConfig, PackageJSONConfig } from '@expo/config';
import JsonFile from '@expo/json-file';
import assert from 'assert';
import chalk from 'chalk';
import resolveFrom from 'resolve-from';
import semver from 'semver';
import { Versions } from 'xdl';

import CommandError from '../../CommandError';
import Log from '../../log';
import { actionAsync } from '../installAsync';
import { BundledNativeModules, getBundledNativeModulesAsync } from './bundledNativeModules';

export async function validateDependenciesVersionsAsync(
  projectRoot: string,
  exp: Pick<ExpoConfig, 'sdkVersion'>,
  pkg: PackageJSONConfig,
  fixDependencies: boolean = false
): Promise<boolean> {
  // expo package for SDK < 33.0.0 does not have bundledNativeModules.json
  if (!Versions.gteSdkVersion(exp, '33.0.0')) {
    return false;
  }

  let bundledNativeModules: BundledNativeModules | null = null;
  try {
    assert(exp.sdkVersion);
    bundledNativeModules = await getBundledNativeModulesAsync(
      projectRoot,
      // sdkVersion is defined here because we ran the >= 33.0.0 check before
      exp.sdkVersion
    );
  } catch {
    Log.warn(
      `Your project uses Expo SDK version >= 33.0.0, but the ${chalk.bold(
        'expo'
      )} package version seems to be older.`
    );
    return false;
  }

  // intersection of packages from package.json and bundled native modules
  const packagesToCheck = getPackagesToCheck(pkg.dependencies, bundledNativeModules);
  // read package versions from the file system (node_modules)
  const packageVersions = await resolvePackageVersionsAsync(projectRoot, packagesToCheck);
  // find incorrect dependencies by comparing the actual package versions with the bundled native module version ranges
  const incorrectDeps = findIncorrectDependencies(packageVersions, bundledNativeModules);

  let issuesFound = false;

  if (incorrectDeps.length > 0) {
    issuesFound = true;

    Log.warn('Some dependencies are incompatible with the installed expo package version:');
    incorrectDeps.forEach(({ packageName, expectedVersionOrRange, actualVersion }) => {
      Log.warn(
        ` - ${chalk.underline(packageName)} - expected version: ${chalk.underline(
          expectedVersionOrRange
        )} - actual version installed: ${chalk.underline(actualVersion)}`
      );
    });
    if (fixDependencies) {
      await actionAsync(
        incorrectDeps.map(dep => dep.packageName),
        {}
      );
    } else {
      Log.warn(
        'Your project may not work correctly until you install the correct versions of the packages.\n' +
          `To install the correct versions of these packages, please run: ${chalk.inverse(
            'expo doctor --fix-dependencies'
          )},\n` +
          `or install individual packages by running ${chalk.inverse(
            'expo install [package-name ...]'
          )}`
      );
    }
  }

  if (Versions.gteSdkVersion(exp, '45.0.0')) {
    try {
      /* This will throw if the dependency looked for is not installed,
       * but that doesn't apply here, so that error is ignored */
      const packageVersionConfigPlugins = await resolvePackageVersionsAsync(projectRoot, [
        '@expo/config-plugins',
      ]);
      if ('@expo/config-plugins' in packageVersionConfigPlugins) {
        if (!semver.intersects('^4.1.0', packageVersionConfigPlugins['@expo/config-plugins'])) {
          if (issuesFound) {
            Log.addNewLineIfNone();
          }
          issuesFound = true;
          Log.warn(`One or more dependencies reference an incompatible version of ${chalk.underline(
            '@expo/config-plugins'
          )}.
- expected version: ${chalk.underline('^4.1.0')} - actual version installed: ${chalk.underline(
            packageVersionConfigPlugins['@expo/config-plugins']
          )}'`);
          Log.warn(`To find out which dependency references ${chalk.underline(
            '@expo/config-plugins'
          )},
run ${chalk.inverse(`yarn why @expo/config-plugins`)} or ${chalk.inverse(
            `npm why @expo/config-plugins`
          )}`);
        }
      }
    } catch {}
  }

  return !issuesFound;
}

function getPackagesToCheck(
  dependencies: Record<string, string> | null | undefined,
  bundledNativeModules: BundledNativeModules
): string[] {
  const dependencyNames = Object.keys(dependencies ?? {});
  const result: string[] = [];
  for (const dependencyName of dependencyNames) {
    if (dependencyName in bundledNativeModules) {
      result.push(dependencyName);
    }
  }
  return result;
}

async function resolvePackageVersionsAsync(
  projectRoot: string,
  packages: string[]
): Promise<Record<string, string>> {
  const packageVersionsFromPackageJSON = await Promise.all(
    packages.map(packageName => getPackageVersionAsync(projectRoot, packageName))
  );
  return packages.reduce((acc, packageName, idx) => {
    acc[packageName] = packageVersionsFromPackageJSON[idx];
    return acc;
  }, {} as Record<string, string>);
}

async function getPackageVersionAsync(projectRoot: string, packageName: string): Promise<string> {
  let packageJsonPath: string | undefined;
  try {
    packageJsonPath = resolveFrom(projectRoot, `${packageName}/package.json`);
  } catch (error: any) {
    // This is a workaround for packages using `exports`. If this doesn't
    // include `package.json`, we have to use the error message to get the location.
    if (error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED') {
      packageJsonPath = error.message.match(/("exports"|defined) in (.*)$/i)?.[2];
    }
  }
  if (!packageJsonPath) {
    throw new CommandError(
      `"${packageName}" is added as a dependency in your project's package.json but it doesn't seem to be installed. Please run "yarn" or "npm install" to fix this issue.`
    );
  }
  const packageJson = await JsonFile.readAsync<BundledNativeModules>(packageJsonPath);
  return packageJson.version;
}

interface IncorrectDependency {
  packageName: string;
  expectedVersionOrRange: string;
  actualVersion: string;
}

function findIncorrectDependencies(
  packageVersions: Record<string, string>,
  bundledNativeModules: BundledNativeModules
): IncorrectDependency[] {
  const packages = Object.keys(packageVersions);
  const incorrectDeps: IncorrectDependency[] = [];
  for (const packageName of packages) {
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
  return incorrectDeps;
}
