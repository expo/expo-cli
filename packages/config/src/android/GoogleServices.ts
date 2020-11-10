import fs from 'fs-extra';
import { resolve } from 'path';

import { ExpoConfig } from '../Config.types';
import { ConfigPlugin } from '../Plugin.types';
import { addWarningAndroid } from '../WarningAggregator';
import {
  withAppBuildGradle,
  withDangerousAndroidMod,
  withProjectBuildGradle,
} from '../plugins/android-plugins';

const DEFAULT_TARGET_PATH = './android/app/google-services.json';

const googleServicesClassPath = 'com.google.gms:google-services';
const googleServicesPlugin = 'com.google.gms.google-services';

// NOTE(brentvatne): This may be annoying to keep up to date...
const googleServicesVersion = '4.3.3';

export const withClassPath: ConfigPlugin<void> = config => {
  return withProjectBuildGradle(config, config => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = setClassPath(config, config.modResults.contents);
    } else {
      addWarningAndroid(
        'android-google-services',
        `Cannot automatically configure project build.gradle if it's not groovy`
      );
    }
    return config;
  });
};

export const withApplyPlugin: ConfigPlugin<void> = config => {
  return withAppBuildGradle(config, config => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = applyPlugin(config, config.modResults.contents);
    } else {
      addWarningAndroid(
        'android-google-services',
        `Cannot automatically configure app build.gradle if it's not groovy`
      );
    }
    return config;
  });
};

/**
 * Add `google-services.json` to project
 */
export const withGoogleServicesFile: ConfigPlugin<void> = config => {
  return withDangerousAndroidMod(config, async config => {
    await setGoogleServicesFile(config, config.modRequest.projectRoot);
    return config;
  });
};

export function getGoogleServicesFilePath(config: Pick<ExpoConfig, 'android'>) {
  return config.android?.googleServicesFile ?? null;
}

export async function setGoogleServicesFile(
  config: Pick<ExpoConfig, 'android'>,
  projectRoot: string,
  targetPath: string = DEFAULT_TARGET_PATH
) {
  const partialSourcePath = getGoogleServicesFilePath(config);
  if (!partialSourcePath) {
    return false;
  }

  const completeSourcePath = resolve(projectRoot, partialSourcePath);
  const destinationPath = resolve(projectRoot, targetPath);

  try {
    await fs.copy(completeSourcePath, destinationPath);
  } catch (e) {
    throw new Error(
      `Cannot copy google-services.json from ${completeSourcePath} to ${destinationPath}. Please make sure the source and destination paths exist.`
    );
  }
  return true;
}

/**
 * Adding the Google Services plugin
 * NOTE(brentvatne): string replacement is a fragile approach! we need a
 * better solution than this.
 */
export function setClassPath(config: Pick<ExpoConfig, 'android'>, buildGradle: string) {
  const googleServicesFile = getGoogleServicesFilePath(config);
  if (!googleServicesFile) {
    return buildGradle;
  }

  if (buildGradle.includes(googleServicesClassPath)) {
    return buildGradle;
  }

  //
  return buildGradle.replace(
    /dependencies\s?{/,
    `dependencies {
        classpath '${googleServicesClassPath}:${googleServicesVersion}'`
  );
}

export function applyPlugin(config: Pick<ExpoConfig, 'android'>, appBuildGradle: string) {
  const googleServicesFile = getGoogleServicesFilePath(config);
  if (!googleServicesFile) {
    return appBuildGradle;
  }

  // Make sure the project does not have the plugin already
  const pattern = new RegExp(`apply\\s+plugin:\\s+['"]${googleServicesPlugin}['"]`);
  if (appBuildGradle.match(pattern)) {
    return appBuildGradle;
  }

  // Add it to the end of the file
  return appBuildGradle + `\napply plugin: '${googleServicesPlugin}'`;
}
