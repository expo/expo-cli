import { ExpoConfig } from '../Config.types';
import { Document, getMainApplication } from './Manifest';

export function getAllowBackup(config: Pick<ExpoConfig, 'android'>): boolean {
  // Defaults to true.
  // https://docs.expo.io/versions/latest/config/app/#allowbackup
  return config.android?.allowBackup ?? true;
}

export async function setAllowBackup(
  config: Pick<ExpoConfig, 'android'>,
  manifestDocument: Document
) {
  const allowBackup = getAllowBackup(config);

  const mainApplication = getMainApplication(manifestDocument);
  if (mainApplication?.['$']) {
    mainApplication['$']['android:allowBackup'] = String(allowBackup);
  }

  return manifestDocument;
}

export function getAllowBackupFromManifest(manifestDocument: Document): boolean | null {
  const mainApplication = getMainApplication(manifestDocument);

  if (mainApplication?.['$']) {
    return mainApplication['$']['android:allowBackup'] === 'true';
  }

  return null;
}
