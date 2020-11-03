import fs from 'fs-extra';
import { sync as globSync } from 'glob';
import path from 'path';

import { ExpoConfig } from '../Config.types';
import { ConfigPlugin } from '../Plugin.types';
import { addWarningAndroid } from '../WarningAggregator';
import {
  createAndroidManifestPlugin,
  withAppBuildGradle,
  withDangerousAndroidMod,
} from '../plugins/android-plugins';
import { AndroidManifest } from './Manifest';
import { getMainApplicationAsync } from './Paths';

export const withPackageManifest = createAndroidManifestPlugin(setPackageInAndroidManifest);

export const withPackageGradle: ConfigPlugin<void> = config => {
  return withAppBuildGradle(config, config => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = setPackageInBuildGradle(config, config.modResults.contents);
    } else {
      addWarningAndroid(
        'android-package',
        `Cannot automatically configure app build.gradle if it's not groovy`
      );
    }
    return config;
  });
};

export const withPackageRefactor: ConfigPlugin<void> = config => {
  return withDangerousAndroidMod(config, async config => {
    await renamePackageOnDisk(config, config.modRequest.projectRoot);
    return config;
  });
};

export function getPackage(config: ExpoConfig) {
  return config.android?.package ?? null;
}

function getPackageRoot(projectRoot: string) {
  return path.join(projectRoot, 'android', 'app', 'src', 'main', 'java');
}

async function getCurrentPackageName(projectRoot: string) {
  const packageRoot = getPackageRoot(projectRoot);
  const mainApplication = await getMainApplicationAsync(projectRoot);
  const packagePath = path.dirname(mainApplication.path);
  const packagePathParts = path.relative(packageRoot, packagePath).split(path.sep).filter(Boolean);

  return packagePathParts.join('.');
}

// NOTE(brentvatne): this assumes that our MainApplication.java file is in the root of the package
// this makes sense for standard react-native projects but may not apply in customized projects, so if
// we want this to be runnable in any app we need to handle other possibilities
export async function renamePackageOnDisk(config: ExpoConfig, projectRoot: string) {
  const newPackageName = getPackage(config);
  if (newPackageName === null) {
    return;
  }

  const currentPackageName = await getCurrentPackageName(projectRoot);
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
    } catch {}
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

export function setPackageInAndroidManifest(config: ExpoConfig, manifestDocument: AndroidManifest) {
  const packageName = getPackage(config);

  if (packageName) {
    manifestDocument.manifest.$.package = packageName;
  } else {
    delete manifestDocument.manifest.$.package;
  }

  return manifestDocument;
}
