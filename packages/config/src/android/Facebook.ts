import { Parser } from 'xml2js';
import { ExpoConfig } from '../Config.types';
import {
  getProjectAndroidManifestPathAsync,
  readAndroidManifestAsync,
  writeAndroidManifestAsync,
} from './Manifest';

const facebookSchemeActivity = (scheme: string) => `
<activity
    android:name="com.facebook.CustomTabActivity"
    android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="${scheme}" />
    </intent-filter>
</activity>
`;

export function getFacebookScheme(config: ExpoConfig) {
  return config.facebookScheme ?? null;
}

export function getFacebookAppId(config: ExpoConfig) {
  return config.facebookAppId ?? null;
}

export function getFacebookDisplayName(config: ExpoConfig) {
  return config.facebookDisplayName ?? null;
}
export function getFacebookAutoInitEnabled(config: ExpoConfig) {
  return config.hasOwnProperty('facebookAutoInitEnabled') ? config.facebookAutoInitEnabled : null;
}

export function getFacebookAutoLogAppEvents(config: ExpoConfig) {
  return config.hasOwnProperty('facebookAutoLogAppEventsEnabled')
    ? config.facebookAutoLogAppEventsEnabled
    : null;
}

export function getFacebookAdvertiserIDCollection(config: ExpoConfig) {
  return config.hasOwnProperty('facebookAdvertiserIDCollectionEnabled')
    ? config.facebookAdvertiserIDCollectionEnabled
    : null;
}

export async function setFacebookConfig(config: ExpoConfig, projectDirectory: string) {
  const scheme = getFacebookScheme(config);
  const appId = getFacebookAppId(config);
  const displayName = getFacebookDisplayName(config);
  const autoInitEnabled = getFacebookAutoInitEnabled(config);
  const autoLogAppEvents = getFacebookAutoLogAppEvents(config);
  const advertiserIdCollection = getFacebookAdvertiserIDCollection(config);

  const manifestPath = await getProjectAndroidManifestPathAsync(projectDirectory);
  if (!manifestPath) {
    return false;
  }

  let androidManifestJson = await readAndroidManifestAsync(manifestPath);
  let mainApplication = androidManifestJson.manifest.application.filter(
    (e: any) => e['$']['android:name'] === '.MainApplication'
  )[0];

  if (scheme) {
    const facebookSchemeActivityXML = facebookSchemeActivity(scheme);
    const parser = new Parser();
    const facebookSchemeActivityJSON = await parser.parseStringPromise(facebookSchemeActivityXML);

    if (mainApplication.hasOwnProperty('activity')) {
      mainApplication['activity'] = mainApplication['activity'].concat(
        facebookSchemeActivityJSON['activity']
      );
    } else {
      mainApplication['activity'] = facebookSchemeActivityJSON['activity'];
    }
  }
  if (appId) {
    mainApplication = addMetaDataItemToMainApplication(
      mainApplication,
      'com.facebook.sdk.ApplicationId',
      appId
    );
  }
  if (displayName) {
    mainApplication = addMetaDataItemToMainApplication(
      mainApplication,
      'com.facebook.sdk.ApplicationName',
      displayName
    );
  }
  if (autoInitEnabled !== null) {
    mainApplication = addMetaDataItemToMainApplication(
      mainApplication,
      'com.facebook.sdk.AutoInitEnabled',
      autoInitEnabled
    );
  }
  if (autoLogAppEvents !== null) {
    mainApplication = addMetaDataItemToMainApplication(
      mainApplication,
      'com.facebook.sdk.AutoLogAppEventsEnabled',
      autoLogAppEvents
    );
  }
  if (advertiserIdCollection !== null) {
    mainApplication = addMetaDataItemToMainApplication(
      mainApplication,
      'com.facebook.sdk.AdvertiserIDCollectionEnabled',
      advertiserIdCollection
    );
  }

  try {
    await writeAndroidManifestAsync(manifestPath, androidManifestJson);
  } catch (e) {
    throw new Error(
      `Error setting Android Google Maps API key. Cannot write new AndroidManifest.xml to ${manifestPath}.`
    );
  }
  return true;
}

function addMetaDataItemToMainApplication(
  mainApplication: any,
  itemName: string,
  itemValue: string
) {
  let existingMetaDataItem;
  const newItem = {
    $: {
      'android:name': itemName,
      'android:value': itemValue,
    },
  };
  if (mainApplication.hasOwnProperty('meta-data')) {
    existingMetaDataItem = mainApplication['meta-data'].filter(
      (e: any) => e['$']['android:name'] === itemName
    );
    if (existingMetaDataItem.length) {
      existingMetaDataItem[0]['$']['android:value'] = itemValue;
    } else {
      mainApplication['meta-data'].push(newItem);
    }
  } else {
    mainApplication['meta-data'] = [newItem];
  }
  return mainApplication;
}
