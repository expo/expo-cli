import { resolve } from 'path';
import { getScheme, setScheme } from '../Scheme';
import { readAndroidManifestAsync } from '../Manifest';

const fixturesPath = resolve(__dirname, 'fixtures');
const sampleManifestPath = resolve(fixturesPath, 'react-native-AndroidManifest.xml');

describe('scheme', () => {
  it(`returns null if no scheme is provided`, () => {
    expect(getScheme({})).toBe(null);
  });

  it(`returns the scheme if provided`, () => {
    expect(getScheme({ scheme: 'myapp' })).toBe('myapp');
  });

  it('adds scheme to android manifest', async () => {
    let androidManifestJson = await readAndroidManifestAsync(sampleManifestPath);
    androidManifestJson = await setScheme({ scheme: 'myapp' }, androidManifestJson);

    let intentFilters = androidManifestJson.manifest.application[0].activity.filter(
      e => e['$']['android:name'] === '.MainActivity'
    )[0]['intent-filter'];
    let schemeIntent = intentFilters.filter(e => {
      if (e.hasOwnProperty('data')) {
        return e['data'][0]['$']['android:scheme'] === 'myapp';
      }
      return false;
    });
    expect(schemeIntent).toHaveLength(1);
  });
});
