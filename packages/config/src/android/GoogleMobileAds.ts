import { ExpoConfig } from '../Config.types';
import {
  getProjectAndroidManifestPathAsync,
  readAndroidManifestAsync,
  writeAndroidManifestAsync,
} from './Manifest';

export function getGoogleMobileAdsAppId(config: ExpoConfig) {
  return config.android?.config?.googleMobileAdsAppId ?? null;
}

export function getGoogleMobileAdsAutoInit(config: ExpoConfig) {
  return config.android?.config?.googleMobileAdsAutoInit ?? false;
}

export async function setGoogleMobileAdsConfig(config: ExpoConfig, projectDirectory: string) {
  const appId = getGoogleMobileAdsAppId(config);
  const autoInit = getGoogleMobileAdsAutoInit(config);

  const manifestPath = await getProjectAndroidManifestPathAsync(projectDirectory);

  if (!appId || !manifestPath) {
    return false;
  }

  let androidManifestJson = await readAndroidManifestAsync(manifestPath);
  let mainApplication = androidManifestJson.manifest.application.filter(
    (e: any) => e['$']['android:name'] === '.MainApplication'
  )[0];

  // add application ID
  let existingApplicationId;
  const newApplicationId = {
    $: {
      'android:name': 'com.google.android.gms.ads.APPLICATION_ID',
      'android:value': appId,
    },
  };
  if (mainApplication.hasOwnProperty('meta-data')) {
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
  const newDelayAutoInit = {
    $: {
      'android:name': 'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT',
      'android:value': !autoInit,
    },
  };
  if (mainApplication.hasOwnProperty('meta-data')) {
    existingDelayAutoInit = mainApplication['meta-data'].filter(
      (e: any) => e['$']['android:name'] === 'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT'
    );
    if (existingDelayAutoInit.length) {
      existingDelayAutoInit[0]['$']['android:value'] = !autoInit;
    } else {
      mainApplication['meta-data'].push(newDelayAutoInit);
    }
  } else {
    mainApplication['meta-data'] = [newDelayAutoInit];
  }

  try {
    await writeAndroidManifestAsync(manifestPath, androidManifestJson);
  } catch (e) {
    throw new Error(
      `Error setting Android Google Mobile Ads config. Cannot write new AndroidManifest.xml to ${manifestPath}.`
    );
  }
  return true;
}
