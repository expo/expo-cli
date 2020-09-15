import { ExpoConfig } from '../Config.types';
import { Document, MetaDataItem } from './Manifest';
import { addOrRemoveMetaDataItemInArray } from './MetaData';

export function getGoogleMapsApiKey(config: ExpoConfig) {
  return config.android?.config?.googleMaps?.apiKey ?? null;
}

export function syncGoogleMapsApiConfigMetaData(config: ExpoConfig): MetaDataItem[] {
  let metadata = config.android?.metadata ?? [];
  metadata = metadata as MetaDataItem[];

  const apiKey = getGoogleMapsApiKey(config);

  metadata = addOrRemoveMetaDataItemInArray(metadata, {
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

  const mainApplication = manifestDocument.manifest.application.filter(
    (e: any) => e['$']['android:name'] === '.MainApplication'
  )[0];

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
