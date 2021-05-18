import { ExpoConfig } from '@expo/config-types';
import fs from 'fs';
import { sync as globSync } from 'glob';
import path from 'path';

import { ConfigPlugin } from '../Plugin.types';
import { createAndroidManifestPlugin, withAppBuildGradle } from '../plugins/android-plugins';
import { withDangerousMod } from '../plugins/withDangerousMod';
import { moveAsync, pathExists } from '../utils/modules';
import * as WarningAggregator from '../utils/warnings';
import { AndroidManifest } from './Manifest';
import { getAppBuildGradleFilePath, getMainApplicationAsync } from './Paths';

export const withPackageManifest = createAndroidManifestPlugin(
  setPackageInAndroidManifest,
  'withPackageManifest'
);

export const withPackageGradle: ConfigPlugin = config => {
  return withAppBuildGradle(config, config => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = setPackageInBuildGradle(config, config.modResults.contents);
    } else {
      WarningAggregator.addWarningAndroid(
        'android-package',
        `Cannot automatically configure app build.gradle if it's not groovy`
      );
    }
    return config;
  });
};

export const withPackageRefactor: ConfigPlugin = config => {
  return withDangerousMod(config, [
    'android',
    async config => {
      await renamePackageOnDisk(config, config.modRequest.projectRoot);
      return config;
    },
  ]);
};

export function getPackage(config: Pick<ExpoConfig, 'android'>) {
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
export async function renamePackageOnDisk(
  config: Pick<ExpoConfig, 'android'>,
  projectRoot: string
) {
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
  fs.mkdirSync(newPackagePath, { mode: 0o777, recursive: true });

  // Move everything from the old directory over
  const paths = globSync('**/*', { cwd: currentPackagePath });
  for (const relativePath of paths) {
    const filepath = path.join(currentPackagePath, relativePath);
    if (fs.lstatSync(filepath).isFile()) {
      await moveAsync(filepath, path.join(newPackagePath, relativePath));
    } else {
      fs.mkdirSync(filepath, { mode: 0o777, recursive: true });
    }
  }

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

export function setPackageInBuildGradle(config: Pick<ExpoConfig, 'android'>, buildGradle: string) {
  const packageName = getPackage(config);
  if (packageName === null) {
    return buildGradle;
  }

  const pattern = new RegExp(`applicationId ['"].*['"]`);
  return buildGradle.replace(pattern, `applicationId '${packageName}'`);
}

export function setPackageInAndroidManifest(
  config: Pick<ExpoConfig, 'android'>,
  androidManifest: AndroidManifest
) {
  const packageName = getPackage(config);

  if (packageName) {
    androidManifest.manifest.$.package = packageName;
  } else {
    delete androidManifest.manifest.$.package;
  }

  return androidManifest;
}

export async function getApplicationIdAsync(projectRoot: string): Promise<string | null> {
  const buildGradlePath = getAppBuildGradleFilePath(projectRoot);
  if (!(await pathExists(buildGradlePath))) {
    return null;
  }
  const buildGradle = await fs.promises.readFile(buildGradlePath, 'utf8');
  const matchResult = buildGradle.match(/applicationId ['"](.*)['"]/);
  // TODO add fallback for legacy cases to read from AndroidManifest.xml
  return matchResult?.[1] ?? null;
}
