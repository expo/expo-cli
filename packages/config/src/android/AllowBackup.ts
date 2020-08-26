import { ExpoConfig } from '../Config.types';
import { Document } from './Manifest';

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

  if (Array.isArray(manifestDocument.manifest.application)) {
    for (const application of manifestDocument.manifest.application) {
      if (application?.['$']) {
        application['$']['android:allowBackup'] = allowBackup ? 'true' : 'false';
      }
    }
  }

  return manifestDocument;
}

export function getAllowBackupFromManifest(manifestDocument: Document): boolean | null {
  if (Array.isArray(manifestDocument.manifest.application)) {
    for (const application of manifestDocument.manifest.application) {
      if (application?.['$']) {
        return application['$']['android:allowBackup'] === 'true';
      }
    }
  }

  return null;
}
