import { dirname, resolve } from 'path';
import fs from 'fs-extra';
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

  describe('sets the android:scheme in AndroidManifest.xml if scheme is given', () => {
    const projectDirectory = resolve(fixturesPath, 'tmp/');
    const appManifestPath = resolve(fixturesPath, 'tmp/android/app/src/main/AndroidManifest.xml');

    beforeAll(async () => {
      await fs.ensureDir(dirname(appManifestPath));
      await fs.copyFile(sampleManifestPath, appManifestPath);
    });

    afterAll(async () => {
      await fs.remove(resolve(fixturesPath, 'tmp/'));
    });

    it('adds scheme to android manifest', async () => {
      expect(await setScheme({ scheme: 'myapp' }, projectDirectory)).toBe(true);
      let androidManifestJson = await readAndroidManifestAsync(appManifestPath);
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
});
