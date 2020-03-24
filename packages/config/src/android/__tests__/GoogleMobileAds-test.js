import { dirname, resolve } from 'path';
import fs from 'fs-extra';
import {
  getGoogleMobileAdsAppId,
  getGoogleMobileAdsAutoInit,
  setGoogleMobileAdsConfig,
} from '../GoogleMobileAds';
import { readAndroidManifestAsync } from '../Manifest';

const fixturesPath = resolve(__dirname, 'fixtures');
const sampleManifestPath = resolve(fixturesPath, 'react-native-AndroidManifest.xml');

describe('Android permissions', () => {
  it(`returns falsey for both if no android google mobileads config is provided`, () => {
    expect(getGoogleMobileAdsAppId({ android: { config: {} } })).toBe(null);
    expect(getGoogleMobileAdsAutoInit({ android: { config: {} } })).toBe(false);
  });

  it(`returns value if android google mobile ads config is provided`, () => {
    expect(
      getGoogleMobileAdsAppId({ android: { config: { googleMobileAdsAppId: 'MY-API-KEY' } } })
    ).toMatch('MY-API-KEY');
    expect(
      getGoogleMobileAdsAutoInit({ android: { config: { googleMobileAdsAutoInit: true } } })
    ).toBe(true);
  });

  describe('sets google maps key in AndroidManifest.xml if given', () => {
    const projectDirectory = resolve(fixturesPath, 'tmp/');
    const appManifestPath = resolve(fixturesPath, 'tmp/android/app/src/main/AndroidManifest.xml');

    beforeAll(async () => {
      await fs.ensureDir(dirname(appManifestPath));
      await fs.copyFile(sampleManifestPath, appManifestPath);
    });

    afterAll(async () => {
      await fs.remove(resolve(fixturesPath, 'tmp/'));
    });

    it('add google mobile ads app config', async () => {
      expect(
        await setGoogleMobileAdsConfig(
          {
            android: {
              config: { googleMobileAdsAppId: 'MY-API-KEY', googleMobileAdsAutoInit: false },
            },
          },
          projectDirectory
        )
      ).toBe(true);

      let androidManifestJson = await readAndroidManifestAsync(appManifestPath);
      let mainApplication = androidManifestJson.manifest.application.filter(
        e => e['$']['android:name'] === '.MainApplication'
      )[0];

      let apiKeyItem = mainApplication['meta-data'].filter(
        e => e['$']['android:name'] === 'com.google.android.gms.ads.APPLICATION_ID'
      );
      expect(apiKeyItem).toHaveLength(1);
      expect(apiKeyItem[0]['$']['android:value']).toMatch('MY-API-KEY');

      let usesLibraryItem = mainApplication['meta-data'].filter(
        e => e['$']['android:name'] === 'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT'
      );
      expect(usesLibraryItem).toHaveLength(1);
      expect(usesLibraryItem[0]['$']['android:value']).toMatch('true');
    });
  });
});
