import { getPackageJson, PackageJSONConfig } from '@expo/config';
import JsonFile from '@expo/json-file';
import chalk from 'chalk';
import fs from 'fs-extra';
import { safeLoad } from 'js-yaml';
import * as path from 'path';

import { AbortCommandError } from '../../../CommandError';
import Log from '../../../log';
import { hashForDependencyMap } from '../../eject/updatePackageJson';
import { installCocoaPodsAsync } from '../../utils/CreateApp';

const EXTERNAL_SOURCES_KEY = 'EXTERNAL SOURCES';

export function getDependenciesFromPodfileLock(podfileLockPath: string) {
  Log.debug(`Reading ${podfileLockPath}`);
  let fileContent;
  try {
    fileContent = fs.readFileSync(podfileLockPath, 'utf8');
  } catch (err) {
    Log.error(
      `Could not find "Podfile.lock" at ${chalk.bold(podfileLockPath)}. Did you run "${chalk.bold(
        'npx pod-install'
      )}"?`
    );
    return {};
  }

  // Previous portions of the lock file could be invalid yaml.
  // Only parse parts that are valid
  const tail = fileContent.split(EXTERNAL_SOURCES_KEY).slice(1);
  const checksumTail = EXTERNAL_SOURCES_KEY + tail;

  return safeLoad(checksumTail)[EXTERNAL_SOURCES_KEY] || {};
}

function getTempPrebuildFolder(projectRoot: string) {
  return path.join(projectRoot, '.expo', 'prebuild');
}

type PackageChecksums = {
  dependencies: string;
  devDependencies: string;
};

function hasNewDependenciesSinceLastBuild(projectRoot: string, packageChecksums: PackageChecksums) {
  // TODO: Maybe comparing lock files would be better...
  const tempDir = getTempPrebuildFolder(projectRoot);
  const tempPkgJsonPath = path.join(tempDir, 'cached-packages.json');
  if (!fs.pathExistsSync(tempPkgJsonPath)) {
    return true;
  }
  const { dependencies, devDependencies } = JsonFile.read(tempPkgJsonPath);
  // Only change the dependencies if the normalized hash changes, this helps to reduce meaningless changes.
  const hasNewDependencies = packageChecksums.dependencies !== dependencies;
  const hasNewDevDependencies = packageChecksums.devDependencies !== devDependencies;

  return hasNewDependencies || hasNewDevDependencies;
}

function createPackageChecksums(pkg: PackageJSONConfig): PackageChecksums {
  return {
    dependencies: hashForDependencyMap(pkg.dependencies || {}),
    devDependencies: hashForDependencyMap(pkg.devDependencies || {}),
  };
}

export async function hasPackageJsonDependencyListChangedAsync(projectRoot: string) {
  const pkg = getPackageJson(projectRoot);

  const packages = createPackageChecksums(pkg);
  const hasNewDependencies = hasNewDependenciesSinceLastBuild(projectRoot, packages);

  // Cache package.json
  const tempDir = path.join(getTempPrebuildFolder(projectRoot), 'cached-packages.json');
  await fs.ensureFile(tempDir);
  await JsonFile.writeAsync(tempDir, packages);

  return hasNewDependencies;
}

function doesProjectUseCocoaPods(projectRoot: string): boolean {
  return fs.existsSync(path.join(projectRoot, 'ios', 'Podfile'));
}

function isLockfileCreated(projectRoot: string): boolean {
  const podfileLockPath = path.join(projectRoot, 'ios', 'Podfile.lock');
  return fs.existsSync(podfileLockPath);
}

// TODO: Same process but with app.config changes + default plugins.
// This will ensure the user is prompted for extra setup.
export default async function maybePromptToSyncPodsAsync(projectRoot: string) {
  if (!doesProjectUseCocoaPods(projectRoot)) {
    // Project does not use CocoaPods
    return;
  }
  if (!isLockfileCreated(projectRoot)) {
    if (!(await installCocoaPodsAsync(projectRoot))) {
      throw new AbortCommandError();
    }
    return;
  }

  // Getting autolinked packages can be heavy, optimize around checking every time.
  if (!(await hasPackageJsonDependencyListChangedAsync(projectRoot))) {
    return;
  }

  await promptToInstallPodsAsync(projectRoot, []);
}

async function promptToInstallPodsAsync(projectRoot: string, missingPods?: string[]) {
  if (missingPods?.length) {
    Log.log(
      `Could not find the following native modules: ${missingPods
        .map(pod => chalk.bold(pod))
        .join(', ')}. Did you forget to run "${chalk.bold('pod install')}" ?`
    );
  }

  try {
    if (!(await installCocoaPodsAsync(projectRoot))) {
      throw new AbortCommandError();
    }
  } catch (error) {
    fs.removeSync(path.join(getTempPrebuildFolder(projectRoot), 'cached-packages.json'));
    throw error;
  }
}
