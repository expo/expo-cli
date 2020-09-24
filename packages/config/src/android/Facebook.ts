import { Parser } from 'xml2js';

import { ExpoConfig } from '../Config.types';
import { addMetaDataItemToMainApplication, Document, getMainApplication } from './Manifest';
import { readResourcesXMLAsync, ResourceItemXML } from './Resources';
import { getProjectStringsXMLPathAsync, removeStringItem, setStringItem } from './Strings';
import { writeXMLAsync } from './XML';

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
  return config.facebookAutoInitEnabled ?? null;
}

export function getFacebookAutoLogAppEvents(config: ExpoConfig) {
  return config.facebookAutoLogAppEventsEnabled ?? null;
}

export function getFacebookAdvertiserIDCollection(config: ExpoConfig) {
  return config.facebookAdvertiserIDCollectionEnabled ?? null;
}

function removeFacebookCustomTabActivities(mainApplication: any) {
  // Remove all Facebook CustomTabActivities first
  if ('activity' in mainApplication) {
    mainApplication['activity'] = mainApplication['activity'].filter(
      (activity: Record<string, any>) => {
        return activity['$']?.['android:name'] !== 'com.facebook.CustomTabActivity';
      }
    );
  }
}

async function ensureFacebookActivityAsync({
  mainApplication,
  scheme,
}: {
  mainApplication: any;
  scheme: string;
}) {
  const facebookSchemeActivityXML = facebookSchemeActivity(scheme);
  const parser = new Parser();
  const facebookSchemeActivityJSON = await parser.parseStringPromise(facebookSchemeActivityXML);

  //TODO: don't write if facebook scheme activity is already present
  if ('activity' in mainApplication) {
    mainApplication['activity'] = mainApplication['activity'].concat(
      facebookSchemeActivityJSON['activity']
    );
  } else {
    mainApplication['activity'] = facebookSchemeActivityJSON['activity'];
  }
}

export async function setFacebookAppIdString(config: ExpoConfig, projectDirectory: string) {
  const appId = getFacebookAppId(config);

  const stringsPath = await getProjectStringsXMLPathAsync(projectDirectory);
  if (!stringsPath) {
    throw new Error(`There was a problem setting your Facebook App ID in ${stringsPath}.`);
  }

  let stringsJSON = await readResourcesXMLAsync({ path: stringsPath });
  if (appId) {
    const stringItemToAdd: ResourceItemXML[] = [{ _: appId, $: { name: 'facebook_app_id' } }];
    stringsJSON = setStringItem(stringItemToAdd, stringsJSON);
  } else {
    stringsJSON = removeStringItem('facebook_app_id', stringsJSON);
  }

  try {
    await writeXMLAsync({ path: stringsPath, xml: stringsJSON });
  } catch (e) {
    throw new Error(`Error setting facebookAppId. Cannot write strings.xml to ${stringsPath}.`);
  }
  return true;
}

export async function setFacebookConfig(config: ExpoConfig, manifestDocument: Document) {
  const scheme = getFacebookScheme(config);
  const appId = getFacebookAppId(config);
  const displayName = getFacebookDisplayName(config);
  const autoInitEnabled = getFacebookAutoInitEnabled(config);
  const autoLogAppEvents = getFacebookAutoLogAppEvents(config);
  const advertiserIdCollection = getFacebookAdvertiserIDCollection(config);

  let mainApplication = getMainApplication(manifestDocument);

  removeFacebookCustomTabActivities(mainApplication);

  if (scheme) {
    ensureFacebookActivityAsync({ scheme, mainApplication });
  }

  if (appId) {
    mainApplication = addMetaDataItemToMainApplication(
      mainApplication,
      'com.facebook.sdk.ApplicationId',
      '@string/facebook_app_id' // The corresponding string is set in setFacebookAppIdString
    );
  } else {
    mainApplication = removeMetaDataItemFromMainApplication(
      mainApplication,
      'com.facebook.sdk.ApplicationId'
    );
  }
  if (displayName) {
    mainApplication = addMetaDataItemToMainApplication(
      mainApplication,
      'com.facebook.sdk.ApplicationName',
      displayName
    );
  } else {
    mainApplication = removeMetaDataItemFromMainApplication(
      mainApplication,
      'com.facebook.sdk.ApplicationName'
    );
  }
  if (autoInitEnabled !== null) {
    mainApplication = addMetaDataItemToMainApplication(
      mainApplication,
      'com.facebook.sdk.AutoInitEnabled',
      autoInitEnabled ? 'true' : 'false'
    );
  } else {
    mainApplication = removeMetaDataItemFromMainApplication(
      mainApplication,
      'com.facebook.sdk.AutoInitEnabled'
    );
  }
  if (autoLogAppEvents !== null) {
    mainApplication = addMetaDataItemToMainApplication(
      mainApplication,
      'com.facebook.sdk.AutoLogAppEventsEnabled',
      autoLogAppEvents ? 'true' : 'false'
    );
  } else {
    mainApplication = removeMetaDataItemFromMainApplication(
      mainApplication,
      'com.facebook.sdk.AutoLogAppEventsEnabled'
    );
  }
  if (advertiserIdCollection !== null) {
    mainApplication = addMetaDataItemToMainApplication(
      mainApplication,
      'com.facebook.sdk.AdvertiserIDCollectionEnabled',
      advertiserIdCollection ? 'true' : 'false'
    );
  } else {
    mainApplication = removeMetaDataItemFromMainApplication(
      mainApplication,
      'com.facebook.sdk.AdvertiserIDCollectionEnabled'
    );
  }

  return manifestDocument;
}

// TODO: Use Manifest version after https://github.com/expo/expo-cli/pull/2587 lands
function removeMetaDataItemFromMainApplication(mainApplication: any, itemName: string) {
  if (mainApplication.hasOwnProperty('meta-data')) {
    const index = mainApplication['meta-data'].findIndex(
      (e: any) => e['$']['android:name'] === itemName
    );

    if (index > -1) {
      mainApplication['meta-data'].splice(index, 1);
    }
  }
  return mainApplication;
}
