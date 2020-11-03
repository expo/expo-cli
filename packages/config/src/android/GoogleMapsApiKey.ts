import { ExpoConfig } from '../Config.types';
import { createAndroidManifestPlugin } from '../plugins/android-plugins';
import { AndroidManifest, getMainApplication, ManifestUsesLibrary } from './Manifest';

export const withGoogleMapsApiKey = createAndroidManifestPlugin(setGoogleMapsApiKey);

export function getGoogleMapsApiKey(config: ExpoConfig) {
  return config.android?.config?.googleMaps?.apiKey ?? null;
}

// TODO: Update all XML handling in this method
export function setGoogleMapsApiKey(config: ExpoConfig, manifestDocument: AndroidManifest) {
  const apiKey = getGoogleMapsApiKey(config);

  if (!apiKey) {
    return manifestDocument;
  }

  let mainApplication = getMainApplication(manifestDocument);
  // TODO: assert instead
  if (!mainApplication) {
    mainApplication = { $: { 'android:name': '.MainApplication' } };
  }
  // add meta-data item
  let existingMetaDataItem;
  const metaDataItem = {
    $: {
      'android:name': 'com.google.android.geo.API_KEY',
      'android:value': apiKey,
    },
  };
  if (mainApplication['meta-data']) {
    existingMetaDataItem = mainApplication['meta-data'].filter(
      (e: any) => e['$']['android:name'] === 'com.google.android.geo.API_KEY'
    );
    if (existingMetaDataItem.length) {
      existingMetaDataItem[0]['$']['android:value'] = apiKey;
    } else {
      mainApplication['meta-data'].push(metaDataItem);
    }
  } else {
    mainApplication['meta-data'] = [metaDataItem];
  }

  // add uses-library item
  let existingUsesLibraryItem;
  const newUsesLibraryItem: ManifestUsesLibrary = {
    $: {
      'android:name': 'org.apache.http.legacy',
      'android:required': 'false',
    },
  };

  if (mainApplication?.['uses-library']) {
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
