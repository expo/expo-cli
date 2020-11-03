import { ExpoConfig } from '../Config.types';
import { createAndroidManifestPlugin } from '../plugins/android-plugins';
import { AndroidManifest, getMainApplication, StringBoolean } from './Manifest';

export const withAllowBackup = createAndroidManifestPlugin(setAllowBackup);

export function getAllowBackup(config: Pick<ExpoConfig, 'android'>): boolean {
  // Defaults to true.
  // https://docs.expo.io/versions/latest/config/app/#allowbackup
  return config.android?.allowBackup ?? true;
}

export function setAllowBackup(
  config: Pick<ExpoConfig, 'android'>,
  manifestDocument: AndroidManifest
) {
  const allowBackup = getAllowBackup(config);

  const mainApplication = getMainApplication(manifestDocument);
  if (mainApplication?.['$']) {
    mainApplication['$']['android:allowBackup'] = String(allowBackup) as StringBoolean;
  }

  return manifestDocument;
}

export function getAllowBackupFromManifest(manifestDocument: AndroidManifest): boolean | null {
  const mainApplication = getMainApplication(manifestDocument);

  if (mainApplication?.['$']) {
    return mainApplication['$']['android:allowBackup'] === 'true';
  }

  return null;
}
