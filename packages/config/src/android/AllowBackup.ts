import { ExpoConfig } from '../Config.types';
import { AndroidManifest, getMainApplication, StringBoolean } from './Manifest';

export function getAllowBackup(config: Pick<ExpoConfig, 'android'>) {
  // Defaults to true.
  // https://docs.expo.io/versions/latest/config/app/#allowbackup
  return config.android?.allowBackup ?? true;
}

export async function setAllowBackup(
  config: Pick<ExpoConfig, 'android'>,
  manifestDocument: AndroidManifest
) {
  const allowBackup = getAllowBackup(config);

  const mainApplication = getMainApplication(manifestDocument);
  if (mainApplication?.$) {
    mainApplication.$['android:allowBackup'] = String(allowBackup) as StringBoolean;
  }

  return manifestDocument;
}

export function getAllowBackupFromManifest(manifestDocument: AndroidManifest): boolean | null {
  const mainApplication = getMainApplication(manifestDocument);

  if (mainApplication?.$) {
    return String(mainApplication.$['android:allowBackup']) === 'true';
  }

  return null;
}
