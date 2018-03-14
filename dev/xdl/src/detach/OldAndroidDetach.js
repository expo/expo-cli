// Copyright 2015-present 650 Industries. All rights reserved.
/**
 * @flow
 */

'use strict';

// Set EXPO_VIEW_DIR to universe/exponent to test locally

import mkdirp from 'mkdirp';
import fs from 'fs-extra';
import path from 'path';
import rimraf from 'rimraf';
import glob from 'glob-promise';

import {
  saveImageToPathAsync,
  rimrafDontThrow,
} from './ExponentTools';
import logger from './Logger';

import Api from '../Api';
import * as Utils from '../Utils';

const ANDROID_TEMPLATE_PKG = 'detach.app.template.pkg.name';
const ANDROID_TEMPLATE_NAME = 'DetachAppTemplate';

async function regexFileAsync(filename, regex, replace) {
  let file = await fs.readFile(filename);
  let fileString = file.toString();
  await fs.writeFile(filename, fileString.replace(regex, replace));
}

async function renamePackageAsync(directory, originalPkg, destPkg) {
  let originalSplitPackage = originalPkg.split('.');
  let originalDeepDirectory = directory;
  for (let i = 0; i < originalSplitPackage.length; i++) {
    originalDeepDirectory = path.join(originalDeepDirectory, originalSplitPackage[i]);
  }

  // copy files into temp directory
  let tmpDirectory = path.join(directory, 'tmp-exponent-directory');
  mkdirp.sync(tmpDirectory);
  await Utils.ncpAsync(originalDeepDirectory, tmpDirectory);

  // delete old package
  rimraf.sync(path.join(directory, originalSplitPackage[0]));

  // make new package
  let newSplitPackage = destPkg.split('.');
  let newDeepDirectory = directory;
  for (let i = 0; i < newSplitPackage.length; i++) {
    newDeepDirectory = path.join(newDeepDirectory, newSplitPackage[i]);
    mkdirp.sync(newDeepDirectory);
  }

  // copy from temp to new package
  await Utils.ncpAsync(tmpDirectory, newDeepDirectory);

  // delete temp
  rimraf.sync(tmpDirectory);
}

export async function detachAndroidAsync(
  projectRoot,
  expoDirectory,
  sdkVersion,
  experienceUrl,
  manifest,
  expoViewUrl: string
) {
  let tmpExpoDirectory;
  if (process.env.EXPO_VIEW_DIR) {
    // Only for testing
    tmpExpoDirectory = process.env.EXPO_VIEW_DIR;
  } else {
    tmpExpoDirectory = path.join(projectRoot, 'temp-android-directory');
    mkdirp.sync(tmpExpoDirectory);
    logger.info('Downloading Android code...');
    await Api.downloadAsync(expoViewUrl, tmpExpoDirectory, { extract: true });
  }

  let androidProjectDirectory = path.join(projectRoot, 'android');

  logger.info('Moving Android project files...');

  await Utils.ncpAsync(
    path.join(tmpExpoDirectory, 'android', 'maven'),
    path.join(expoDirectory, 'maven')
  );
  await Utils.ncpAsync(
    path.join(tmpExpoDirectory, 'android', 'detach-scripts'),
    path.join(expoDirectory, 'detach-scripts')
  );
  await Utils.ncpAsync(
    path.join(tmpExpoDirectory, 'exponent-view-template', 'android'),
    androidProjectDirectory
  );
  if (process.env.EXPO_VIEW_DIR) {
    rimraf.sync(path.join(androidProjectDirectory, 'build'));
    rimraf.sync(path.join(androidProjectDirectory, 'app', 'build'));
  }

  // Fix up app/build.gradle
  logger.info('Configuring Android project...');
  let appBuildGradle = path.join(androidProjectDirectory, 'app', 'build.gradle');
  await regexFileAsync(appBuildGradle, /\/\* UNCOMMENT WHEN DISTRIBUTING/g, '');
  await regexFileAsync(appBuildGradle, /END UNCOMMENT WHEN DISTRIBUTING \*\//g, '');
  await regexFileAsync(appBuildGradle, `compile project(':expoview')`, '');

  // Fix AndroidManifest
  let androidManifest = path.join(
    androidProjectDirectory,
    'app',
    'src',
    'main',
    'AndroidManifest.xml'
  );
  await regexFileAsync(androidManifest, 'PLACEHOLDER_DETACH_SCHEME', manifest.detach.scheme);

  // Fix MainActivity
  let mainActivity = path.join(
    androidProjectDirectory,
    'app',
    'src',
    'main',
    'java',
    'detach',
    'app',
    'template',
    'pkg',
    'name',
    'MainActivity.java'
  );
  await regexFileAsync(mainActivity, 'TEMPLATE_INITIAL_URL', experienceUrl);

  // Fix package name
  let packageName = manifest.android.package;
  await renamePackageAsync(
    path.join(androidProjectDirectory, 'app', 'src', 'main', 'java'),
    ANDROID_TEMPLATE_PKG,
    packageName
  );
  await renamePackageAsync(
    path.join(androidProjectDirectory, 'app', 'src', 'test', 'java'),
    ANDROID_TEMPLATE_PKG,
    packageName
  );
  await renamePackageAsync(
    path.join(androidProjectDirectory, 'app', 'src', 'androidTest', 'java'),
    ANDROID_TEMPLATE_PKG,
    packageName
  );

  let packageNameMatches = await glob(androidProjectDirectory + '/**/*.@(java|gradle|xml)');
  if (packageNameMatches) {
    let oldPkgRegex = new RegExp(`${ANDROID_TEMPLATE_PKG.replace(/\./g, '\\.')}`, 'g');
    for (let i = 0; i < packageNameMatches.length; i++) {
      await regexFileAsync(packageNameMatches[i], oldPkgRegex, packageName);
    }
  }

  // Fix app name
  logger.info('Naming Android project...');
  let appName = manifest.name;
  await regexFileAsync(
    path.resolve(androidProjectDirectory, 'app', 'src', 'main', 'res', 'values', 'strings.xml'),
    ANDROID_TEMPLATE_NAME,
    appName
  );

  // Fix image
  let icon = manifest.android && manifest.android.icon ? manifest.android.icon : manifest.icon;
  if (icon) {
    let iconMatches = await glob(
      path.join(androidProjectDirectory, 'app', 'src', 'main', 'res') + '/**/ic_launcher.png'
    );
    if (iconMatches) {
      for (let i = 0; i < iconMatches.length; i++) {
        await fs.unlink(iconMatches[i]);
        // TODO: make more efficient
        await saveImageToPathAsync(projectRoot, icon, iconMatches[i]);
      }
    }
  }

  // Clean up
  logger.info('Cleaning up Android...');
  if (!process.env.EXPO_VIEW_DIR) {
    rimrafDontThrow(tmpExpoDirectory);
  }
  logger.info('Android detach is complete!\n');
}
