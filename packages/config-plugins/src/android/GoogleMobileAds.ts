import { ExpoConfig } from '@expo/config-types';

import { createAndroidManifestPlugin } from '../plugins/android-plugins';
import {
  addMetaDataItemToMainApplication,
  AndroidManifest,
  getMainApplicationOrThrow,
  removeMetaDataItemFromMainApplication,
} from './Manifest';

const META_APPLICATION_ID = 'com.google.android.gms.ads.APPLICATION_ID';
const META_DELAY_APP_MEASUREMENT_INIT = 'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT';

export const withGoogleMobileAdsConfig = createAndroidManifestPlugin(
  setGoogleMobileAdsConfig,
  'withGoogleMobileAdsConfig'
);

export function getGoogleMobileAdsAppId(config: Pick<ExpoConfig, 'android'>) {
  return config.android?.config?.googleMobileAdsAppId ?? null;
}

export function getGoogleMobileAdsAutoInit(config: Pick<ExpoConfig, 'android'>) {
  return config.android?.config?.googleMobileAdsAutoInit ?? false;
}

export function setGoogleMobileAdsConfig(
  config: Pick<ExpoConfig, 'android'>,
  androidManifest: AndroidManifest
) {
  const appId = getGoogleMobileAdsAppId(config);
  const autoInit = getGoogleMobileAdsAutoInit(config);
  const mainApplication = getMainApplicationOrThrow(androidManifest);

  if (appId) {
    addMetaDataItemToMainApplication(mainApplication, META_APPLICATION_ID, appId);
    addMetaDataItemToMainApplication(
      mainApplication,
      META_DELAY_APP_MEASUREMENT_INIT,
      String(!autoInit)
    );
  } else {
    removeMetaDataItemFromMainApplication(mainApplication, META_APPLICATION_ID);
    removeMetaDataItemFromMainApplication(mainApplication, META_DELAY_APP_MEASUREMENT_INIT);
  }

  return androidManifest;
}
