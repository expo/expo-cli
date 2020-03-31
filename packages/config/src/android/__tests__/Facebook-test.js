import { resolve } from 'path';
import {
  getFacebookAdvertiserIDCollection,
  getFacebookAppId,
  getFacebookAutoInitEnabled,
  getFacebookAutoLogAppEvents,
  getFacebookDisplayName,
  getFacebookScheme,
  setFacebookConfig,
} from '../Facebook';
import { readAndroidManifestAsync } from '../Manifest';

const fixturesPath = resolve(__dirname, 'fixtures');
const sampleManifestPath = resolve(fixturesPath, 'react-native-AndroidManifest.xml');

describe('Android facebook config', () => {
  it(`returns null from all getters if no value provided`, () => {
    expect(getFacebookScheme({})).toBe(null);
    expect(getFacebookAppId({})).toBe(null);
    expect(getFacebookDisplayName({})).toBe(null);
    expect(getFacebookAutoLogAppEvents({})).toBe(null);
    expect(getFacebookAutoInitEnabled({})).toBe(null);
    expect(getFacebookAdvertiserIDCollection({})).toBe(null);
  });

  it(`returns correct value from all getters if value provided`, () => {
    expect(getFacebookScheme({ facebookScheme: 'myscheme' })).toMatch('myscheme');
    expect(getFacebookAppId({ facebookAppId: 'my-app-id' })).toMatch('my-app-id');
    expect(getFacebookDisplayName({ facebookDisplayName: 'my-display-name' })).toMatch(
      'my-display-name'
    );
    expect(getFacebookAutoLogAppEvents({ facebookAutoLogAppEventsEnabled: false })).toBe(false);
    expect(getFacebookAutoInitEnabled({ facebookAutoInitEnabled: true })).toBe(true);
    expect(
      getFacebookAdvertiserIDCollection({ facebookAdvertiserIDCollectionEnabled: false })
    ).toBe(false);
  });

  it('adds scheme, appid, display name, autolog events, auto init, advertiser id collection to androidmanifest.xml', async () => {
    let androidManifestJson = await readAndroidManifestAsync(sampleManifestPath);
    const facebookConfig = {
      facebookScheme: 'myscheme',
      facebookAppId: 'my-app-id',
      facebookDisplayName: 'my-display-name',
      facebookAutoLogAppEventsEnabled: false,
      facebookAutoInitEnabled: true,
      facebookAdvertiserIDCollectionEnabled: false,
    };
    androidManifestJson = await setFacebookConfig(facebookConfig, androidManifestJson);
    let mainApplication = androidManifestJson.manifest.application.filter(
      e => e['$']['android:name'] === '.MainApplication'
    )[0];
    let facebookActivity = mainApplication['activity'].filter(
      e => e['$']['android:name'] === 'com.facebook.CustomTabActivity'
    );
    expect(facebookActivity).toHaveLength(1);
    let applicationId = mainApplication['meta-data'].filter(
      e => e['$']['android:name'] === 'com.facebook.sdk.ApplicationId'
    );
    expect(applicationId).toHaveLength(1);
    expect(applicationId[0]['$']['android:value']).toMatch('@string/facebook_app_id');

    let displayName = mainApplication['meta-data'].filter(
      e => e['$']['android:name'] === 'com.facebook.sdk.ApplicationName'
    );
    expect(displayName).toHaveLength(1);
    expect(displayName[0]['$']['android:value']).toMatch(facebookConfig.facebookDisplayName);

    let autoLogAppEventsEnabled = mainApplication['meta-data'].filter(
      e => e['$']['android:name'] === 'com.facebook.sdk.AutoLogAppEventsEnabled'
    );
    expect(autoLogAppEventsEnabled).toHaveLength(1);
    expect(autoLogAppEventsEnabled[0]['$']['android:value']).toMatch(
      facebookConfig.facebookAutoLogAppEventsEnabled.toString()
    );

    let advertiserIDCollectionEnabled = mainApplication['meta-data'].filter(
      e => e['$']['android:name'] === 'com.facebook.sdk.AdvertiserIDCollectionEnabled'
    );
    expect(advertiserIDCollectionEnabled).toHaveLength(1);
    expect(advertiserIDCollectionEnabled[0]['$']['android:value']).toMatch(
      facebookConfig.facebookAdvertiserIDCollectionEnabled.toString()
    );

    let autoInitEnabled = mainApplication['meta-data'].filter(
      e => e['$']['android:name'] === 'com.facebook.sdk.AutoInitEnabled'
    );
    expect(autoInitEnabled).toHaveLength(1);
    expect(autoInitEnabled[0]['$']['android:value']).toMatch(
      facebookConfig.facebookAutoInitEnabled.toString()
    );
  });
});
