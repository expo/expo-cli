import { resolve } from 'path';

import { getMainActivity, readAndroidManifestAsync } from '../Manifest';
import {
  appendScheme,
  ensureManifestHasValidIntentFilter,
  getScheme,
  getSchemesFromManifest,
  hasScheme,
  removeScheme,
  setScheme,
} from '../Scheme';

const fixturesPath = resolve(__dirname, 'fixtures');
const sampleManifestPath = resolve(fixturesPath, 'react-native-AndroidManifest.xml');

describe('scheme', () => {
  it(`returns empty array if no scheme is provided`, () => {
    expect(getScheme({})).toStrictEqual([]);
  });

  it(`returns the scheme if provided`, () => {
    expect(getScheme({ scheme: 'myapp' })).toStrictEqual(['myapp']);
    expect(getScheme({ scheme: ['other', 'myapp'] })).toStrictEqual(['other', 'myapp']);
    expect(
      getScheme({
        scheme: ['other', 'myapp', null],
      })
    ).toStrictEqual(['other', 'myapp']);
  });

  it('does not add scheme if none provided', async () => {
    let androidManifestJson = await readAndroidManifestAsync(sampleManifestPath);
    androidManifestJson = await setScheme({}, androidManifestJson);

    expect(androidManifestJson).toEqual(androidManifestJson);
  });

  it('adds scheme to android manifest', async () => {
    let androidManifestJson = await readAndroidManifestAsync(sampleManifestPath);
    androidManifestJson = await setScheme(
      {
        scheme: 'myapp',
        android: { scheme: ['android-only'], package: 'com.demo.value' },
        ios: { scheme: 'ios-only' },
      },
      androidManifestJson
    );

    const mainActivity = getMainActivity(androidManifestJson);
    const intentFilters = mainActivity['intent-filter'];

    const schemeIntent = [];

    for (const intent of intentFilters) {
      if ('data' in intent) {
        for (const dataFilter of intent['data']) {
          const possibleScheme = dataFilter['$']['android:scheme'];
          if (possibleScheme) {
            schemeIntent.push(possibleScheme);
          }
        }
      }
    }

    expect(schemeIntent).toStrictEqual(['myapp', 'android-only', 'com.demo.value']);
  });
});

function removeSingleTaskFromActivities(manifest) {
  for (const application of manifest.manifest['application']) {
    for (const activity of application.activity) {
      if (activity['$']['android:launchMode'] === 'singleTask') {
        delete activity['$']['android:launchMode'];
      }
    }
  }

  return manifest;
}

describe('Schemes', () => {
  it(`ensure manifest has valid intent filter added`, async () => {
    const manifest = await readAndroidManifestAsync(sampleManifestPath);
    const manifestHasValidIntentFilter = ensureManifestHasValidIntentFilter(manifest);
    expect(manifestHasValidIntentFilter).toBe(true);
  });

  it(`detect if no singleTask Activity exists`, async () => {
    const manifest = await readAndroidManifestAsync(sampleManifestPath);
    removeSingleTaskFromActivities(manifest);

    expect(ensureManifestHasValidIntentFilter(manifest)).toBe(false);
  });

  it(`adds and removes a new scheme`, async () => {
    const manifest = await readAndroidManifestAsync(sampleManifestPath);
    ensureManifestHasValidIntentFilter(manifest);

    const modifiedManifest = appendScheme('myapp.test', manifest);
    const schemes = getSchemesFromManifest(modifiedManifest);
    expect(schemes).toContain('myapp.test');
    const removedManifest = removeScheme('myapp.test', manifest);
    expect(getSchemesFromManifest(removedManifest)).not.toContain('myapp.test');
  });

  it(`detect when a duplicate might be added`, async () => {
    const manifest = await readAndroidManifestAsync(sampleManifestPath);
    ensureManifestHasValidIntentFilter(manifest);

    const modifiedManifest = appendScheme('myapp.test', manifest);
    expect(hasScheme('myapp.test', modifiedManifest)).toBe(true);
  });

  it(`detect a non-existent scheme`, async () => {
    const manifest = await readAndroidManifestAsync(sampleManifestPath);

    expect(hasScheme('myapp.test', manifest)).toBe(false);
  });
});
