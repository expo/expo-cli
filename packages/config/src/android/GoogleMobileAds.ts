import { ExpoConfig } from '../Config.types';
import { MetaDataItem } from './Manifest';
import { addOrRemoveMetaDataItemInArray, removeMetaDataItem } from './MetaData';

export function getGoogleMobileAdsAppId(config: ExpoConfig) {
  return config.android?.config?.googleMobileAdsAppId ?? null;
}

export function getGoogleMobileAdsAutoInit(config: ExpoConfig) {
  return config.android?.config?.googleMobileAdsAutoInit ?? false;
}

export function syncGoogleMobileAdsConfigMetaData(config: ExpoConfig): MetaDataItem[] {
  let metadata = config.android?.metadata ?? [];
  metadata = metadata as MetaDataItem[];

  const appId = getGoogleMobileAdsAppId(config);

  const autoInit = getGoogleMobileAdsAutoInit(config);

  metadata = addOrRemoveMetaDataItemInArray(metadata, {
    name: 'com.google.android.gms.ads.APPLICATION_ID',
    value: appId,
  });

  // Only add gms ads data if appId is defined, but always remove the keys if they don't exist.
  if (appId && autoInit != null) {
    metadata.push({
      name: 'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT',
      value: String(!autoInit),
    });
  } else {
    metadata = removeMetaDataItem(
      metadata,
      'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT'
    );
  }

  return metadata;
}
