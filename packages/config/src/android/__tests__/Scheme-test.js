import { resolve } from 'path';

import { formatAndroidManifest, readAndroidManifestAsync } from '../Manifest';
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

function removeSingleTaskFromActivities(manifest) {
  for (let application of manifest.manifest['application']) {
    for (let activity of application.activity) {
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
    let manifest = await readAndroidManifestAsync(sampleManifestPath);
    ensureManifestHasValidIntentFilter(manifest);

    const modifiedManifest = appendScheme('myapp.test', manifest);
    expect(hasScheme('myapp.test', modifiedManifest)).toBe(true);
  });

  it(`detect a non-existent scheme`, async () => {
    const manifest = await readAndroidManifestAsync(sampleManifestPath);

    expect(hasScheme('myapp.test', manifest)).toBe(false);
  });
});
