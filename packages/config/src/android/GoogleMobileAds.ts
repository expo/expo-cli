import { ExpoConfig } from '../Config.types';
import {
  addMetaDataItemToMainApplication,
  AndroidManifest,
  getMainApplicationOrThrow,
  removeMetaDataItemFromMainApplication,
} from './Manifest';

const APPLICATION_ID = 'com.google.android.gms.ads.APPLICATION_ID';
const DELAY_APP_MEASUREMENT_INIT = 'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT';

export function getGoogleMobileAdsAppId(config: Pick<ExpoConfig, 'android'>) {
  return config.android?.config?.googleMobileAdsAppId ?? null;
}

export function getGoogleMobileAdsAutoInit(config: Pick<ExpoConfig, 'android'>) {
  return config.android?.config?.googleMobileAdsAutoInit ?? false;
}

export function setGoogleMobileAdsConfig(
  config: Pick<ExpoConfig, 'android'>,
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
