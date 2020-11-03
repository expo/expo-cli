import { ExpoConfig } from '../Config.types';
import {
  addMetaDataItemToMainApplication,
  AndroidManifest,
  getMainApplicationOrThrow,
  removeMetaDataItemFromMainApplication,
} from './Manifest';

const APPLICATION_ID = 'com.google.android.gms.ads.APPLICATION_ID';
const DELAY_APP_MEASUREMENT_INIT = 'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT';

export function getGoogleMobileAdsAppId(config: ExpoConfig) {
  return config.android?.config?.googleMobileAdsAppId ?? null;
}

export function getGoogleMobileAdsAutoInit(config: ExpoConfig) {
  return config.android?.config?.googleMobileAdsAutoInit ?? false;
}

export async function setGoogleMobileAdsConfig(
  config: ExpoConfig,
  manifestDocument: AndroidManifest
) {
  const appId = getGoogleMobileAdsAppId(config);
  const autoInit = getGoogleMobileAdsAutoInit(config);
  const mainApplication = getMainApplicationOrThrow(manifestDocument);

  if (appId) {
    addMetaDataItemToMainApplication(mainApplication, APPLICATION_ID, appId);
    addMetaDataItemToMainApplication(
      mainApplication,
      DELAY_APP_MEASUREMENT_INIT,
      String(!autoInit)
    );
  } else {
    removeMetaDataItemFromMainApplication(mainApplication, APPLICATION_ID);
    removeMetaDataItemFromMainApplication(mainApplication, DELAY_APP_MEASUREMENT_INIT);
  }

  return manifestDocument;
}
