import { ExpoConfig } from '../Config.types';
import {
  addMetaDataItemToMainApplication,
  AndroidManifest,
  getMainApplication,
  removeMetaDataItemFromMainApplication,
} from './Manifest';

export function getBranchApiKey(config: ExpoConfig) {
  return config.android?.config?.branch?.apiKey ?? null;
}

export async function setBranchApiKey(config: ExpoConfig, manifestDocument: AndroidManifest) {
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
