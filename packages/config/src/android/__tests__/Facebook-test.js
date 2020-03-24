import { dirname, resolve } from 'path';
import fs from 'fs-extra';
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

  describe('write Facebook config to androidmanifest.xml correctly', () => {
    const projectDirectory = resolve(fixturesPath, 'tmp/');
    const appManifestPath = resolve(fixturesPath, 'tmp/android/app/src/main/AndroidManifest.xml');

    beforeAll(async () => {
      await fs.ensureDir(dirname(appManifestPath));
      await fs.copyFile(sampleManifestPath, appManifestPath);
    });

    afterAll(async () => {
      await fs.remove(resolve(fixturesPath, 'tmp/'));
    });

    it('adds scheme, appid, display name, autolog events, auto init, advertiser id collection', async () => {
      const facebookConfig = {
        facebookScheme: 'myscheme',
        facebookAppId: 'my-app-id',
        facebookDisplayName: 'my-display-name',
        facebookAutoLogAppEventsEnabled: 'false',
        facebookAutoInitEnabled: 'true',
        facebookAdvertiserIDCollectionEnabled: 'false',
      };
      expect(await setFacebookConfig(facebookConfig, projectDirectory)).toBe(true);

      let androidManifestJson = await readAndroidManifestAsync(appManifestPath);
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
      expect(applicationId[0]['$']['android:value']).toMatch(facebookConfig.facebookAppId);

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
        facebookConfig.facebookAutoLogAppEventsEnabled
      );

      let advertiserIDCollectionEnabled = mainApplication['meta-data'].filter(
        e => e['$']['android:name'] === 'com.facebook.sdk.AdvertiserIDCollectionEnabled'
      );
      expect(advertiserIDCollectionEnabled).toHaveLength(1);
      expect(advertiserIDCollectionEnabled[0]['$']['android:value']).toMatch(
        facebookConfig.facebookAdvertiserIDCollectionEnabled
      );

      let autoInitEnabled = mainApplication['meta-data'].filter(
        e => e['$']['android:name'] === 'com.facebook.sdk.AutoInitEnabled'
      );
      expect(autoInitEnabled).toHaveLength(1);
      expect(autoInitEnabled[0]['$']['android:value']).toMatch(
        facebookConfig.facebookAutoInitEnabled
      );
    });
  });
});
