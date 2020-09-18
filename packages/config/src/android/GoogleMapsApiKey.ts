import { ExpoConfig } from '../Config.types';
import { Document, getMainApplication, MetaDataItemMap } from './Manifest';
import { addOrRemoveMetadataItemInArray, getMetadataFromConfig } from './MetaData';

export function getGoogleMapsApiKey(config: ExpoConfig) {
  return config.android?.config?.googleMaps?.apiKey ?? null;
}

export function syncGoogleMapsApiConfigMetaData(config: ExpoConfig): MetaDataItemMap {
  let metadata = getMetadataFromConfig(config);

  const apiKey = getGoogleMapsApiKey(config);

  metadata = addOrRemoveMetadataItemInArray(metadata, {
    name: 'com.google.android.geo.API_KEY',
    value: apiKey,
  });

  return metadata;
}

export async function setGoogleMapsApiKey(config: ExpoConfig, manifestDocument: Document) {
  const apiKey = getGoogleMapsApiKey(config);

  if (!apiKey) {
    return manifestDocument;
  }

  const mainApplication = getMainApplication(manifestDocument);

  // add uses-library item
  let existingUsesLibraryItem;
  const newUsesLibraryItem = {
    $: {
      'android:name': 'org.apache.http.legacy',
      'android:required': 'false',
    },
  };

  if (mainApplication.hasOwnProperty('uses-library')) {
    existingUsesLibraryItem = mainApplication['uses-library'].filter(
      (e: any) => e['$']['android:name'] === 'org.apache.http.legacy'
    );
    if (existingUsesLibraryItem.length) {
      existingUsesLibraryItem[0]['$']['android:required'] = 'false';
    } else {
      mainApplication['uses-library'].push(newUsesLibraryItem);
    }
  } else {
    mainApplication['uses-library'] = [newUsesLibraryItem];
  }

  return manifestDocument;
}
