import { ExpoConfig } from '@expo/config-types';

import { createAndroidManifestPlugin } from '../plugins/android-plugins';
import {
  addMetaDataItemToMainApplication,
  AndroidManifest,
  getMainApplicationOrThrow,
  removeMetaDataItemFromMainApplication,
} from './Manifest';

const META_BRANCH_KEY = 'io.branch.sdk.BranchKey';

export const withBranch = createAndroidManifestPlugin(setBranchApiKey, 'withBranch');

export function getBranchApiKey(config: ExpoConfig) {
  return config.android?.config?.branch?.apiKey ?? null;
}

export function setBranchApiKey(config: ExpoConfig, androidManifest: AndroidManifest) {
  const apiKey = getBranchApiKey(config);

  const mainApplication = getMainApplicationOrThrow(androidManifest);

  if (apiKey) {
    // If the item exists, add it back
    addMetaDataItemToMainApplication(mainApplication, META_BRANCH_KEY, apiKey);
  } else {
    // Remove any existing item
    removeMetaDataItemFromMainApplication(mainApplication, META_BRANCH_KEY);
  }
  return androidManifest;
}
