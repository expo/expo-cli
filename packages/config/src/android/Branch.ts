import { ExpoConfig } from '../Config.types';
import { createAndroidManifestPlugin } from '../plugins/android-plugins';
import {
  addMetaDataItemToMainApplication,
  AndroidManifest,
  getMainApplication,
  removeMetaDataItemFromMainApplication,
} from './Manifest';

export const withBranch = createAndroidManifestPlugin(setBranchApiKey);

export function getBranchApiKey(config: ExpoConfig) {
  return config.android?.config?.branch?.apiKey ?? null;
}

export function setBranchApiKey(config: ExpoConfig, manifestDocument: AndroidManifest) {
  const apiKey = getBranchApiKey(config);

  const mainApplication = getMainApplication(manifestDocument);

  if (apiKey) {
    // If the item exists, add it back
    addMetaDataItemToMainApplication(mainApplication, 'io.branch.sdk.BranchKey', apiKey);
  } else {
    // Remove any existing item
    removeMetaDataItemFromMainApplication(mainApplication, 'io.branch.sdk.BranchKey');
  }
  return manifestDocument;
}
