import rimraf from 'rimraf';
import path from 'path';
import fs from 'fs-extra';
import { sync as globSync } from 'glob';
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
  let packageRoot = getPackageRoot(projectRoot);
  let mainApplicationPath = globSync(path.join(packageRoot, '**', 'MainApplication.java'))[0];
  let packagePath = path.dirname(mainApplicationPath);
  let packagePathParts = packagePath
    .replace(packageRoot, '')
    .split(path.sep)
    .filter(Boolean);

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
  let packageRoot = getPackageRoot(projectRoot);
  let currentPackagePath = path.join(packageRoot, ...currentPackageName.split('.'));
  let newPackagePath = path.join(packageRoot, ...newPackageName.split('.'));

  // Create the new directory
  fs.mkdirpSync(newPackagePath);

  // Move everything from the old directory over
  globSync(path.join(currentPackagePath, '**', '*')).forEach(filepath => {
    let relativePath = filepath.replace(currentPackagePath, '');
    if (fs.lstatSync(filepath).isFile()) {
      fs.copySync(filepath, path.join(newPackagePath, relativePath));
    } else {
      fs.mkdirpSync(filepath);
    }
  });

  // Remove the old directory entirely
  rimraf.sync(path.join(packageRoot, currentPackageName.split('.')[0]));

  const filesToUpdate = [
    ...globSync(path.join(newPackagePath, '**', '*')),
    path.join(projectRoot, 'android', 'app', 'BUCK'),
  ];
  // Replace all occurrences of the path in the project
  filesToUpdate.forEach((filepath: string) => {
    try {
      if (fs.lstatSync(filepath).isFile()) {
        let contents = fs.readFileSync(filepath).toString();
        while (contents.includes(currentPackageName)) {
          contents = contents.replace(currentPackageName, newPackageName);
        }
        fs.writeFileSync(filepath, contents);
      }
    } catch (_) {}
  });
}

export function setPackageInBuildGradle(config: ExpoConfig, buildGradle: string) {
  let packageName = getPackage(config);
  if (packageName === null) {
    return buildGradle;
  }

  let pattern = new RegExp(`applicationId ['"].*['"]`);
  return buildGradle.replace(pattern, `applicationId '${packageName}'`);
}

export async function setPackageInAndroidManifest(config: ExpoConfig, manifestDocument: Document) {
  let packageName = getPackage(config);

  manifestDocument['manifest']['$']['package'] = packageName;

  return manifestDocument;
}
