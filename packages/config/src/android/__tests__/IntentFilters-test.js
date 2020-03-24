import fs from 'fs-extra';
import { dirname, resolve } from 'path';
import { readAndroidManifestAsync } from '../Manifest';
import { getIntentFilters, setAndroidIntentFilters } from '../IntentFilters';

const fixturesPath = resolve(__dirname, 'fixtures');
const sampleManifestPath = resolve(fixturesPath, 'react-native-AndroidManifest.xml');

describe('Android intent filters', () => {
  const appManifestPath = resolve(fixturesPath, 'tmp/android/app/src/main/AndroidManifest.xml');
  const projectDirectory = resolve(fixturesPath, 'tmp/');

  beforeAll(async () => {
    await fs.ensureDir(dirname(appManifestPath));
    await fs.copyFile(sampleManifestPath, appManifestPath);
  });

  afterAll(async () => {
    await fs.remove(resolve(fixturesPath, 'tmp/'));
  });

  it(`returns empty array if no intent filters are provided`, () => {
    expect(getIntentFilters({})).toEqual([]);
  });

  it(`returns false if bad project directory`, async () => {
    expect(
      await setAndroidIntentFilters(
        {
          android: {
            intentFilters: [
              {
                action: 'VIEW',
                data: {
                  scheme: 'https',
                  host: '*.myapp.io',
                },
                category: ['BROWSABLE', 'DEFAULT'],
              },
            ],
          },
        },
        'bad/directory/'
      )
    ).toBe(false);
  });

  it(`writes intent filter to android manifest`, async () => {
    expect(
      await setAndroidIntentFilters(
        {
          android: {
            intentFilters: [
              {
                action: 'VIEW',
                data: {
                  scheme: 'https',
                  host: '*.myapp.io',
                },
                category: ['BROWSABLE', 'DEFAULT'],
              },
            ],
          },
        },
        projectDirectory
      )
    ).toBe(true);

    let androidManifestJson = await readAndroidManifestAsync(appManifestPath);
    expect(
      androidManifestJson.manifest.application[0].activity.filter(
        e => e['$']['android:name'] === '.MainActivity'
      )[0]['intent-filter']
    ).toHaveLength(2);
  });
});
