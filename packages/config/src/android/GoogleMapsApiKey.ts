import { ExpoConfig } from '../Config.types';
import {
  addMetaDataItemToMainApplication,
  addUsesLibraryItemToMainApplication,
  AndroidManifest,
  getMainApplicationOrThrow,
  removeMetaDataItemFromMainApplication,
  removeUsesLibraryItemFromMainApplication,
} from './Manifest';

export function getGoogleMapsApiKey(config: Pick<ExpoConfig, 'android'>) {
  return config.android?.config?.googleMaps?.apiKey ?? null;
}

export function setGoogleMapsApiKey(
  config: Pick<ExpoConfig, 'android'>,
  androidManifest: AndroidManifest
) {
  const apiKey = getGoogleMapsApiKey(config);
  const mainApplication = getMainApplicationOrThrow(androidManifest);

  if (apiKey) {
    // If the item exists, add it back
    addMetaDataItemToMainApplication(mainApplication, 'com.google.android.geo.API_KEY', apiKey);
    addUsesLibraryItemToMainApplication(mainApplication, {
      name: 'org.apache.http.legacy',
      required: false,
    });
  } else {
    // Remove any existing item
    removeMetaDataItemFromMainApplication(mainApplication, 'com.google.android.geo.API_KEY');
    removeUsesLibraryItemFromMainApplication(mainApplication, 'org.apache.http.legacy');
  }

  return androidManifest;
}
