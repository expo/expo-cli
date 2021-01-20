import { getPackageJson, PackageJSONConfig } from '@expo/config';
import JsonFile from '@expo/json-file';
import chalk from 'chalk';
import fs from 'fs-extra';
import { safeLoad } from 'js-yaml';
import * as path from 'path';

import log from '../../log';
import { confirmAsync } from '../../prompts';
import { createDependenciesMap, DependenciesMap, hashForDependencyMap } from '../eject/Eject';
import { installCocoaPodsAsync } from '../utils/CreateApp';

const CHECKSUM_KEY = 'SPEC CHECKSUMS';

export function getDependenciesFromPodfileLock(podfileLockPath: string) {
  log.debug(`Reading ${podfileLockPath}`);
  let fileContent;
  try {
    fileContent = fs.readFileSync(podfileLockPath, 'utf8');
  } catch (err) {
    log.error(
      `Could not find "Podfile.lock" at ${chalk.dim(podfileLockPath)}. Did you run "${chalk.bold(
        'npx pod-install'
      )}"?`
    );
    return [];
  }

  // Previous portions of the lock file could be invalid yaml.
  // Only parse parts that are valid
  const tail = fileContent.split(CHECKSUM_KEY).slice(1);
  const checksumTail = CHECKSUM_KEY + tail;

  return Object.keys(safeLoad(checksumTail)[CHECKSUM_KEY] || {});
}

async function getAutolinkedIOSDependenciesAsync(
  projectRoot: string
): Promise<{ name: string; podspecPath: string }[]> {
  // TODO: Get this somehow -- possibly via https://github.com/expo/expo/pull/11593
  return [];
}

function getTempPrebuildFolder(projectRoot: string) {
  return path.join(projectRoot, '.expo', 'prebuild');
}

function hasNewDependenciesSinceLastBuild(projectRoot: string, pkg: PackageJSONConfig) {
  // TODO: Maybe comparing lock files would be better...
  const tempDir = getTempPrebuildFolder(projectRoot);
  const tempPkgJsonPath = path.join(tempDir, '__package.json');
  if (!fs.pathExistsSync(tempPkgJsonPath)) {
    return true;
  }
  const { dependencies, devDependencies } = JsonFile.read(tempPkgJsonPath);

  const combinedDependencies: DependenciesMap = createDependenciesMap({
    ...(dependencies as any),
  });

  const combinedDevDependencies: DependenciesMap = createDependenciesMap({
    ...(devDependencies as any),
  });

  // Only change the dependencies if the normalized hash changes, this helps to reduce meaningless changes.
  const hasNewDependencies =
    hashForDependencyMap(pkg.dependencies) !== hashForDependencyMap(combinedDependencies);
  const hasNewDevDependencies =
    hashForDependencyMap(pkg.devDependencies) !== hashForDependencyMap(combinedDevDependencies);

  return hasNewDependencies || hasNewDevDependencies;
}

async function shouldValidatePodsAsync(projectRoot: string) {
  const pkg = getPackageJson(projectRoot);

  const hasNewDependencies = hasNewDependenciesSinceLastBuild(projectRoot, pkg);

  // Cache package.json
  const tempDir = path.join(getTempPrebuildFolder(projectRoot), '__package.json');
  await fs.ensureFile(tempDir);
  await JsonFile.writeAsync(tempDir, pkg);

  return hasNewDependencies;
}

// TODO: Same process but with app.config changes + default plugins.
// This will ensure the user is prompted for extra setup.
export default async function maybePromptToSyncPodsAsync(projectRoot: string) {
  if (!fs.existsSync(path.join(projectRoot, 'ios', 'Podfile'))) {
    // Project does not use CocoaPods
    return;
  }
  const podfileLockPath = path.join(projectRoot, 'ios', 'Podfile.lock');
  if (!fs.existsSync(podfileLockPath)) {
    await installCocoaPodsAsync(projectRoot);
    return;
  }

  // Getting autolinked packages can be heavy, optimize around checking every time.
  if (!(await shouldValidatePodsAsync(projectRoot))) {
    return;
  }
  await promptToInstallPodsAsync(projectRoot, []);
}

async function promptToInstallPodsAsync(projectRoot: string, missingPods?: string[]) {
  if (missingPods?.length) {
    log(
      `Could not find the following native modules: ${missingPods
        .map(pod => chalk.bold(pod))
        .join(', ')}. Did you forget to run "${chalk.bold('pod install')}" ?`
    );
  }
  if (
    await confirmAsync({
      message: 'Sync CocoaPods?',
    })
  ) {
    await installCocoaPodsAsync(projectRoot);
  }
}
