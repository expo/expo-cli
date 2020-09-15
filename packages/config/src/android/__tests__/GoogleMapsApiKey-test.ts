import { resolve } from 'path';

import {
  getGoogleMapsApiKey,
  setGoogleMapsApiKey,
  syncGoogleMapsApiConfigMetaData,
} from '../GoogleMapsApiKey';
import { getMainApplication, readAndroidManifestAsync } from '../Manifest';

const fixturesPath = resolve(__dirname, 'fixtures');
const sampleManifestPath = resolve(fixturesPath, 'react-native-AndroidManifest.xml');

describe('Android google maps api key', () => {
  it(`returns null if no android google maps api key is provided`, () => {
    expect(getGoogleMapsApiKey({ android: { config: { googleMaps: {} } } })).toBe(null);
  });

  it(`returns apikey if android google maps api key is provided`, () => {
    expect(
      getGoogleMapsApiKey({ android: { config: { googleMaps: { apiKey: 'MY-API-KEY' } } } })
    ).toBe('MY-API-KEY');
  });

  it('add google maps key to androidmanifest.xml', async () => {
    let androidManifestJson = await readAndroidManifestAsync(sampleManifestPath);
    androidManifestJson = await setGoogleMapsApiKey(
      { android: { config: { googleMaps: { apiKey: 'MY-API-KEY' } } } },
      androidManifestJson
    );

    const mainApplication = getMainApplication(androidManifestJson);

    const usesLibraryItem = mainApplication['uses-library'].filter(
      e => e['$']['android:name'] === 'org.apache.http.legacy'
    );
    expect(usesLibraryItem).toHaveLength(1);
    expect(usesLibraryItem[0]['$']['android:required']).toMatch('false');
  });

  describe('syncing', () => {
    it('adds google maps key config to metadata', async () => {
      const metadata = await syncGoogleMapsApiConfigMetaData({
        android: { config: { googleMaps: { apiKey: 'MY-API-KEY' } } },
      });

      expect(metadata).toStrictEqual({
        'com.google.android.geo.API_KEY': {
          value: 'MY-API-KEY',
        },
      });
    });

    it('removes google API key from existing metadata when the expo specific value is missing', async () => {
      const metadata = await syncGoogleMapsApiConfigMetaData({
        android: {
          config: {},
          metadata: {
            'com.google.android.geo.API_KEY': {
              value: 'MY-API-KEY',
            },
          },
        },
      });

      expect(metadata).toStrictEqual({});
    });
  });
});
