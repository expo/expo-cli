import { dirname, resolve } from 'path';
import fs from 'fs-extra';
import { getBranchApiKey, setBranchApiKey } from '../Branch';
import { readAndroidManifestAsync } from '../Manifest';

const fixturesPath = resolve(__dirname, 'fixtures');
const sampleManifestPath = resolve(fixturesPath, 'react-native-AndroidManifest.xml');

describe('Android branch test', () => {
  it(`returns null if no android branch api key is provided`, () => {
    expect(getBranchApiKey({ android: { config: {} } })).toBe(null);
  });

  it(`returns apikey if android branch api key is provided`, () => {
    expect(getBranchApiKey({ android: { config: { branch: { apiKey: 'MY-API-KEY' } } } })).toBe(
      'MY-API-KEY'
    );
  });

  describe('sets branch api key in AndroidManifest.xml if given', () => {
    const projectDirectory = resolve(fixturesPath, 'tmp/');
    const appManifestPath = resolve(fixturesPath, 'tmp/android/app/src/main/AndroidManifest.xml');

    beforeAll(async () => {
      await fs.ensureDir(dirname(appManifestPath));
      await fs.copyFile(sampleManifestPath, appManifestPath);
    });

    afterAll(async () => {
      await fs.remove(resolve(fixturesPath, 'tmp/'));
    });

    it('add branch api key', async () => {
      expect(
        await setBranchApiKey(
          { android: { config: { branch: { apiKey: 'MY-API-KEY' } } } },
          projectDirectory
        )
      ).toBe(true);

      let androidManifestJson = await readAndroidManifestAsync(appManifestPath);
      let mainApplication = androidManifestJson.manifest.application.filter(
        e => e['$']['android:name'] === '.MainApplication'
      )[0];

      let apiKeyItem = mainApplication['meta-data'].filter(
        e => e['$']['android:name'] === 'io.branch.sdk.BranchKey'
      );
      expect(apiKeyItem).toHaveLength(1);
      expect(apiKeyItem[0]['$']['android:value']).toMatch('MY-API-KEY');
    });
  });
});
