import { ExpoConfig } from '../Config.types';
import { assert } from '../Errors';
import {
  addMetaDataItemToMainApplication,
  AndroidManifest,
  getMainApplication,
  ManifestActivity,
  ManifestApplication,
  prefixAndroidKeys,
  removeMetaDataItemFromMainApplication,
} from './Manifest';
import { buildResourceItem, readResourcesXMLAsync, ResourceXML } from './Resources';
import { getProjectStringsXMLPathAsync, removeStringItem, setStringItem } from './Strings';
import { writeXMLAsync } from './XML';

function buildXMLItem({
  head,
  children,
}: {
  head: Record<string, string>;
  children?: Record<string, string | any[]>;
}) {
  return { ...(children ?? {}), $: head };
}

function buildAndroidItem(datum: string | Record<string, any>) {
  const item = typeof datum === 'string' ? { name: datum } : datum;
  const head = prefixAndroidKeys(item);
  return buildXMLItem({ head });
}

function getFacebookSchemeActivity(scheme: string) {
  /**
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
   */
  return buildXMLItem({
    head: prefixAndroidKeys({
      name: 'com.facebook.CustomTabActivity',
      exported: 'true',
    }),
    children: {
      'intent-filter': [
        {
          action: [buildAndroidItem('android.intent.action.VIEW')],
          category: [
            buildAndroidItem('android.intent.category.DEFAULT'),
            buildAndroidItem('android.intent.category.BROWSABLE'),
          ],
          data: [buildAndroidItem({ scheme })],
        },
      ],
    },
  }) as ManifestActivity;
}

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

function ensureFacebookActivity({
  mainApplication,
  scheme,
}: {
  mainApplication: ManifestApplication;
  scheme: string | null;
}) {
  if (Array.isArray(mainApplication.activity)) {
    // Remove all Facebook CustomTabActivities first
    mainApplication.activity = mainApplication.activity.filter(activity => {
      return activity.$?.['android:name'] !== 'com.facebook.CustomTabActivity';
    });
  } else {
    mainApplication.activity = [];
  }

  // If a new scheme is defined, append it to the activity.
  if (scheme) {
    mainApplication.activity.push(getFacebookSchemeActivity(scheme));
  }
  return mainApplication;
}

export async function setFacebookAppIdString(config: ExpoConfig, projectDirectory: string) {
  const stringsPath = await getProjectStringsXMLPathAsync(projectDirectory);
  assert(stringsPath, `There was a problem setting your Facebook App ID in "${stringsPath}"`);

  let stringsJSON = await readResourcesXMLAsync({ path: stringsPath });
  stringsJSON = applyFacebookAppIdString(config, stringsJSON);

  try {
    await writeXMLAsync({ path: stringsPath, xml: stringsJSON });
  } catch {
    throw new Error(`Error setting facebookAppId. Cannot write strings.xml to "${stringsPath}"`);
  }
  return true;
}

function applyFacebookAppIdString(config: ExpoConfig, stringsJSON: ResourceXML) {
  const appId = getFacebookAppId(config);

  if (appId) {
    return setStringItem(
      [buildResourceItem({ name: 'facebook_app_id', value: appId })],
      stringsJSON
    );
  }
  return removeStringItem('facebook_app_id', stringsJSON);
}

export function setFacebookConfig(config: ExpoConfig, androidManifest: AndroidManifest) {
  const scheme = getFacebookScheme(config);

  const appId = getFacebookAppId(config);
  const displayName = getFacebookDisplayName(config);
  const autoInitEnabled = getFacebookAutoInitEnabled(config);
  const autoLogAppEvents = getFacebookAutoLogAppEvents(config);
  const advertiserIdCollection = getFacebookAdvertiserIDCollection(config);

  let mainApplication = getMainApplication(androidManifest);

  assert(mainApplication != null, 'Main application is not defined in the AndroidManifest.xml');

  mainApplication = ensureFacebookActivity({ scheme, mainApplication });

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

  return androidManifest;
}
