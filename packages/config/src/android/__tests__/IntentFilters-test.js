import { resolve } from 'path';
import { readAndroidManifestAsync } from '../Manifest';
import { getIntentFilters, setAndroidIntentFilters } from '../IntentFilters';

const fixturesPath = resolve(__dirname, 'fixtures');
const sampleManifestPath = resolve(fixturesPath, 'react-native-AndroidManifest.xml');

describe('Android intent filters', () => {
  it(`returns empty array if no intent filters are provided`, () => {
    expect(getIntentFilters({})).toEqual([]);
  });

  it(`writes intent filter to android manifest`, async () => {
    let androidManifestJson = await readAndroidManifestAsync(sampleManifestPath);
    androidManifestJson = await setAndroidIntentFilters(
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
      androidManifestJson
    );

    expect(
      androidManifestJson.manifest.application[0].activity.filter(
        e => e['$']['android:name'] === '.MainActivity'
      )[0]['intent-filter']
    ).toHaveLength(2);
  });

  xit(`does not duplicate android intent filters`, async () => {
    let androidManifestJson = await readAndroidManifestAsync(sampleManifestPath);
    androidManifestJson = await setAndroidIntentFilters(
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
      androidManifestJson
    );

    androidManifestJson = await setAndroidIntentFilters(
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
      androidManifestJson
    );

    expect(
      androidManifestJson.manifest.application[0].activity.filter(
        e => e['$']['android:name'] === '.MainActivity'
      )[0]['intent-filter']
    ).toHaveLength(2);
  });
});
