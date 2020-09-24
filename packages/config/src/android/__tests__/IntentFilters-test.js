import { resolve } from 'path';

import { getIntentFilters, setAndroidIntentFilters } from '../IntentFilters';
import { getMainActivityXML, readAndroidManifestAsync } from '../Manifest';

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

    expect(getMainActivityXML(androidManifestJson)['intent-filter']).toHaveLength(2);
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

    const mainActivity = getMainActivityXML(androidManifestJson);

    expect(mainActivity['intent-filter']).toHaveLength(2);
  });
});
