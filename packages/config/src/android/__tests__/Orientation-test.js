import fs, { ensureDir } from 'fs-extra';
import { dirname, resolve } from 'path';
import { readAndroidManifestAsync } from '../Manifest';

import { getOrientation, setAndroidOrientation } from '../Orientation';

const fixturesPath = resolve(__dirname, 'fixtures');
const sampleManifestPath = resolve(fixturesPath, 'react-native-AndroidManifest.xml');

describe('Android orientation', () => {
  it(`returns null if no orientation is provided`, () => {
    expect(getOrientation({})).toBe(null);
  });

  it(`returns orientation if provided`, () => {
    expect(getOrientation({ orientation: 'landscape' })).toMatch('landscape');
  });

  describe('File changes', () => {
    const appManifestPath = resolve(fixturesPath, 'tmp/android/app/src/main/AndroidManifest.xml');
    let androidManifestJson;
    beforeAll(async () => {
      await fs.ensureDir(dirname(appManifestPath));
      await fs.copyFile(sampleManifestPath, appManifestPath);
    });

    afterAll(async () => {
      await fs.remove(resolve(fixturesPath, 'tmp/'));
    });

    it('adds orientation attribute if not present', async () => {
      androidManifestJson = await readAndroidManifestAsync(appManifestPath);
      androidManifestJson = await setAndroidOrientation(
        { orientation: 'landscape' },
        androidManifestJson
      );

      let mainActivity = androidManifestJson.manifest.application[0].activity.filter(
        e => e['$']['android:name'] === '.MainActivity'
      );
      expect(mainActivity[0]['$']['android:screenOrientation']).toMatch('landscape');
    });

    it('replaces orientation attribute if present', async () => {
      androidManifestJson = await readAndroidManifestAsync(appManifestPath);

      androidManifestJson = await setAndroidOrientation(
        { orientation: 'portrait' },
        androidManifestJson
      );
      let mainActivity = androidManifestJson.manifest.application[0].activity.filter(
        e => e['$']['android:name'] === '.MainActivity'
      );
      expect(mainActivity[0]['$']['android:screenOrientation']).toMatch('portrait');
    });
  });
});
