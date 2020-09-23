import { ExpoConfig } from '../Config.types';
import { Document, getMainApplication, ManifestMetaData } from './Manifest';

export function getGoogleMobileAdsAppId(config: ExpoConfig) {
  return config.android?.config?.googleMobileAdsAppId ?? null;
}

export function getGoogleMobileAdsAutoInit(config: ExpoConfig) {
  return config.android?.config?.googleMobileAdsAutoInit ?? false;
}

export async function setGoogleMobileAdsConfig(config: ExpoConfig, manifestDocument: Document) {
  const appId = getGoogleMobileAdsAppId(config);
  const autoInit = getGoogleMobileAdsAutoInit(config);

  if (!appId) {
    return manifestDocument;
  }

  let mainApplication = getMainApplication(manifestDocument);
  if (!mainApplication) {
    mainApplication = { $: { 'android:name': '.MainApplication' } };
  }

  // add application ID
  let existingApplicationId;
  const newApplicationId = {
    $: {
      'android:name': 'com.google.android.gms.ads.APPLICATION_ID',
      'android:value': appId,
    },
  };
  if (mainApplication['meta-data']) {
    existingApplicationId = mainApplication['meta-data'].filter(
      (e: any) => e['$']['android:name'] === 'com.google.android.gms.ads.APPLICATION_ID'
    );
    if (existingApplicationId.length) {
      existingApplicationId[0]['$']['android:value'] = appId;
    } else {
      mainApplication['meta-data'].push(newApplicationId);
    }
  } else {
    mainApplication['meta-data'] = [newApplicationId];
  }

  // add delay auto init
  let existingDelayAutoInit;
  const newDelayAutoInit: ManifestMetaData = {
    $: {
      'android:name': 'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT',
      'android:value': String(!autoInit),
    },
  };
  if (mainApplication['meta-data']) {
    existingDelayAutoInit = mainApplication['meta-data'].filter(
      (e: any) => e['$']['android:name'] === 'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT'
    );
    if (existingDelayAutoInit.length) {
      existingDelayAutoInit[0]['$']['android:value'] = String(!autoInit);
    } else {
      mainApplication['meta-data'].push(newDelayAutoInit);
    }
  } else {
    mainApplication['meta-data'] = [newDelayAutoInit];
  }

  return manifestDocument;
}
