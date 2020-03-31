import fs from 'fs-extra';
import { resolve } from 'path';
import { ExpoConfig } from '../Config.types';

const DEFAULT_TARGET_PATH = './android/app/google-services.json';

export function getGoogleServicesFilePath(config: ExpoConfig) {
  return config.android?.googleServicesFile ?? null;
}

export async function setGoogleServicesFile(
  config: ExpoConfig,
  projectDirectory: string,
  targetPath: string = DEFAULT_TARGET_PATH
) {
  let partialSourcePath = getGoogleServicesFilePath(config);
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
