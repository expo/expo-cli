import { ExpoConfig } from '../Config.types';
import {
  addMetaDataItemToMainApplication,
  AndroidManifest,
  getMainApplicationOrThrow,
  removeMetaDataItemFromMainApplication,
} from './Manifest';

export function getBranchApiKey(config: ExpoConfig) {
  return config.android?.config?.branch?.apiKey ?? null;
}

export function setBranchApiKey(config: ExpoConfig, androidManifest: AndroidManifest) {
  const apiKey = getBranchApiKey(config);

  const mainApplication = getMainApplicationOrThrow(androidManifest);

  if (apiKey) {
    // If the item exists, add it back
    addMetaDataItemToMainApplication(mainApplication, 'io.branch.sdk.BranchKey', apiKey);
  } else {
    // Remove any existing item
    removeMetaDataItemFromMainApplication(mainApplication, 'io.branch.sdk.BranchKey');
  }
  return androidManifest;
}
