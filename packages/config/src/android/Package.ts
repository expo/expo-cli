import fs from 'fs-extra';
import { sync as globSync } from 'glob';
import path from 'path';

import { ExpoConfig } from '../Config.types';
import { Document } from './Manifest';

export function getPackage(config: ExpoConfig) {
  if (config.android && config.android.package) {
    return config.android.package;
  }

  return null;
}

function getPackageRoot(projectRoot: string) {
  return path.join(projectRoot, 'android', 'app', 'src', 'main', 'java');
}

function getCurrentPackageName(projectRoot: string) {
  const packageRoot = getPackageRoot(projectRoot);
  const mainApplicationPath = globSync('**/MainApplication.java', {
    absolute: true,
    cwd: packageRoot,
  })[0];
  const packagePath = path.dirname(mainApplicationPath);
  const packagePathParts = packagePath.replace(packageRoot, '').split(path.sep).filter(Boolean);

  return packagePathParts.join('.');
}

// NOTE(brentvatne): this assumes that our MainApplication.java file is in the root of the package
// this makes sense for standard react-native projects but may not apply in customized projects, so if
// we want this to be runnable in any app we need to handle other possibilities
export function renamePackageOnDisk(config: ExpoConfig, projectRoot: string) {
  const newPackageName = getPackage(config);
  if (newPackageName === null) {
    return;
  }

  const currentPackageName = getCurrentPackageName(projectRoot);
  if (currentPackageName === newPackageName) {
    return;
  }

  // Set up our paths
  const packageRoot = getPackageRoot(projectRoot);
  const currentPackagePath = path.join(packageRoot, ...currentPackageName.split('.'));
  const newPackagePath = path.join(packageRoot, ...newPackageName.split('.'));

  // Create the new directory
  fs.mkdirpSync(newPackagePath);

  // Move everything from the old directory over
  globSync('**/*', { cwd: currentPackagePath }).forEach(relativePath => {
    const filepath = path.join(currentPackagePath, relativePath);
    if (fs.lstatSync(filepath).isFile()) {
      fs.moveSync(filepath, path.join(newPackagePath, relativePath));
    } else {
      fs.mkdirpSync(filepath);
    }
  });

  // Remove the old directory recursively from com/old/package to com/old and com,
  // as long as the directories are empty
  const oldPathParts = currentPackageName.split('.');
  while (oldPathParts.length) {
    const pathToCheck = path.join(packageRoot, ...oldPathParts);
    try {
      const files = fs.readdirSync(pathToCheck);
      if (files.length === 0) {
        fs.rmdirSync(pathToCheck);
      }
    } catch (_) {
    } finally {
      oldPathParts.pop();
    }
  }

  const filesToUpdate = [
    ...globSync('**/*', { cwd: newPackagePath, absolute: true }),
    path.join(projectRoot, 'android', 'app', 'BUCK'),
  ];
  // Replace all occurrences of the path in the project
  filesToUpdate.forEach((filepath: string) => {
    try {
      if (fs.lstatSync(filepath).isFile()) {
        let contents = fs.readFileSync(filepath).toString();
        contents = contents.replace(new RegExp(currentPackageName, 'g'), newPackageName);
        fs.writeFileSync(filepath, contents);
      }
    } catch (_) {}
  });
}

export function setPackageInBuildGradle(config: ExpoConfig, buildGradle: string) {
  const packageName = getPackage(config);
  if (packageName === null) {
    return buildGradle;
  }

  const pattern = new RegExp(`applicationId ['"].*['"]`);
  return buildGradle.replace(pattern, `applicationId '${packageName}'`);
}

export async function setPackageInAndroidManifest(config: ExpoConfig, manifestDocument: Document) {
  const packageName = getPackage(config);

  manifestDocument['manifest']['$']['package'] = packageName;

  return manifestDocument;
}
