import { ExpoConfig } from '../Config.types';
import { MetaDataItemMap } from './Manifest';
import { addOrRemoveMetaDataItemInArray } from './MetaData';

export function getGoogleMobileAdsAppId(config: ExpoConfig) {
  return config.android?.config?.googleMobileAdsAppId ?? null;
}

export function getGoogleMobileAdsAutoInit(config: ExpoConfig) {
  return config.android?.config?.googleMobileAdsAutoInit ?? false;
}

export function syncGoogleMobileAdsConfigMetaData(config: ExpoConfig): MetaDataItemMap {
  let metadata = config.android?.metadata ?? {};

  const appId = getGoogleMobileAdsAppId(config);

  const autoInit = getGoogleMobileAdsAutoInit(config);

  metadata = addOrRemoveMetaDataItemInArray(metadata, {
    name: 'com.google.android.gms.ads.APPLICATION_ID',
    value: appId,
  });
  // Only add gms ads data if appId is defined, but always remove the keys if they don't exist.
  metadata = addOrRemoveMetaDataItemInArray(
    metadata,
    {
      name: 'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT',
      value: !autoInit,
    },
    !!appId && autoInit != null
  );

  return metadata;
}
