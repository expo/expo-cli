import { ConfigPlugin, ExpoConfig } from '../Config.types';
import { Document, getMainApplication, withManifest } from './Manifest';

/**
 * Defaults to true. https://docs.expo.io/versions/latest/config/app/#allowbackup
 *
 * @param config
 */
export function getAllowBackup(config: Pick<ExpoConfig, 'android'>): boolean {
  return config.android?.allowBackup ?? true;
}

export const withAllowBackup: ConfigPlugin = config => {
  return withManifest(config, props => ({
    ...props,
    data: setAllowBackup(config.expo, props.data!),
  }));
};

export function setAllowBackup(
  config: Pick<ExpoConfig, 'android'>,
  manifestDocument: Document
): Document {
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
