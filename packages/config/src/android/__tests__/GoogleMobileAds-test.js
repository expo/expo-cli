import { resolve } from 'path';
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

  it('add google mobile ads app config to androidmanifest.xml', async () => {
    let androidManifestJson = await readAndroidManifestAsync(sampleManifestPath);
    androidManifestJson = await setGoogleMobileAdsConfig(
      {
        android: {
          config: { googleMobileAdsAppId: 'MY-API-KEY', googleMobileAdsAutoInit: false },
        },
      },
      androidManifestJson
    );

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
    expect(usesLibraryItem[0]['$']['android:value']).toBe(true);
  });
});
