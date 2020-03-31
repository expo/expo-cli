import { resolve } from 'path';
import { getGoogleMapsApiKey, setGoogleMapsApiKey } from '../GoogleMapsApiKey';
import { readAndroidManifestAsync } from '../Manifest';

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

    let mainApplication = androidManifestJson.manifest.application.filter(
      e => e['$']['android:name'] === '.MainApplication'
    )[0];

    let apiKeyItem = mainApplication['meta-data'].filter(
      e => e['$']['android:name'] === 'com.google.android.geo.API_KEY'
    );
    expect(apiKeyItem).toHaveLength(1);
    expect(apiKeyItem[0]['$']['android:value']).toMatch('MY-API-KEY');

    let usesLibraryItem = mainApplication['uses-library'].filter(
      e => e['$']['android:name'] === 'org.apache.http.legacy'
    );
    expect(usesLibraryItem).toHaveLength(1);
    expect(usesLibraryItem[0]['$']['android:required']).toMatch('false');
  });
});
