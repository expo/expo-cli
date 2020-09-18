import { ExpoConfig } from '../Config.types';
import { MetaDataItemMap } from './Manifest';
import { addOrRemoveMetadataItemInArray, getMetadataFromConfig } from './MetaData';

export function getGoogleMobileAdsAppId(config: ExpoConfig) {
  return config.android?.config?.googleMobileAdsAppId ?? null;
}

export function getGoogleMobileAdsAutoInit(config: ExpoConfig) {
  return config.android?.config?.googleMobileAdsAutoInit ?? false;
}

export function syncGoogleMobileAdsConfigMetaData(config: ExpoConfig): MetaDataItemMap {
  let metadata = getMetadataFromConfig(config);

  const appId = getGoogleMobileAdsAppId(config);

  const autoInit = getGoogleMobileAdsAutoInit(config);

  metadata = addOrRemoveMetadataItemInArray(metadata, {
    name: 'com.google.android.gms.ads.APPLICATION_ID',
    value: appId,
  });
  // Only add gms ads data if appId is defined, but always remove the keys if they don't exist.
  metadata = addOrRemoveMetadataItemInArray(
    metadata,
    {
      name: 'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT',
      value: !autoInit,
    },
    !!appId && autoInit != null
  );

  return metadata;
}
