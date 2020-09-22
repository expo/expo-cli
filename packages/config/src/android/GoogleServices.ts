import fs from 'fs-extra';
import { resolve } from 'path';

import { ConfigPlugin, ExpoConfig, ExportedConfig, ProjectFileSystem } from '../Config.types';
import { withAfter } from '../plugins/withAfter';
import { withDangerousAppBuildGradle, withDangerousBuildGradle } from '../plugins/withAndroid';
import { withPlugins } from '../plugins/withPlugins';

const DEFAULT_TARGET_PATH = './android/app/google-services.json';

export function getGoogleServicesFilePath(config: ExpoConfig) {
  return config.android?.googleServicesFile ?? null;
}

export const withGoogleServices: ConfigPlugin = config => {
  return withPlugins(config, [withClassPath, withApplyPlugin, withConfigFile]);
};

export const withConfigFile = (
  config: ExportedConfig,
  targetPath: string = DEFAULT_TARGET_PATH
): ExportedConfig => {
  return withAfter(config, 'android', async props => ({
    ...props,
    ...(await applyGoogleServiceFile(config.expo, props, targetPath)),
  }));
};

export function applyGoogleServiceFile(
  config: ExpoConfig,
  { projectRoot, files, pushFile }: ProjectFileSystem,
  targetPath: string
): Pick<ProjectFileSystem, 'files'> {
  const partialSourcePath = getGoogleServicesFilePath(config);
  if (!partialSourcePath) {
    return { files };
  }

  const completeSourcePath = resolve(projectRoot, partialSourcePath);
  const destinationPath = resolve(projectRoot, targetPath);

  pushFile(destinationPath, fs.readFileSync(completeSourcePath));

  return { files };
}

export async function setGoogleServicesFile(
  config: ExpoConfig,
  projectDirectory: string,
  targetPath: string = DEFAULT_TARGET_PATH
) {
  const partialSourcePath = getGoogleServicesFilePath(config);
  if (!partialSourcePath) {
    return false;
  }

  const completeSourcePath = resolve(projectDirectory, partialSourcePath);
  const destinationPath = resolve(projectDirectory, targetPath);

  try {
    await fs.copy(completeSourcePath, destinationPath);
  } catch (e) {
    throw new Error(
      `Cannot copy google-services.json from ${completeSourcePath} to ${destinationPath}. Please make sure the source and destination paths exist.`
    );
  }
  return true;
}

const googleServicesClassPath = 'com.google.gms:google-services';
const googleServicesPlugin = 'com.google.gms.google-services';

// NOTE(brentvatne): This may be annoying to keep up to date...
const googleServicesVersion = '4.3.3';

export const withClassPath: ConfigPlugin = config => {
  return withDangerousBuildGradle(config, async props => ({
    ...props,
    data: await setClassPath(config.expo, props.data),
  }));
};

/**
 * Adding the Google Services plugin
 * NOTE(brentvatne): string replacement is a fragile approach! we need a
 * better solution than this.
 */
export function setClassPath(config: ExpoConfig, buildGradle: string) {
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

export const withApplyPlugin: ConfigPlugin = config => {
  return withDangerousAppBuildGradle(config, async props => ({
    ...props,
    data: await applyPlugin(config.expo, props.data),
  }));
};

export function applyPlugin(config: ExpoConfig, appBuildGradle: string) {
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
