import { resolve } from 'path';

import * as Schemes from '../Schemes';
import * as Manifest from '..';

const fixturesPath = resolve(__dirname, 'fixtures');
const manifestPath = resolve(fixturesPath, 'react-native-AndroidManifest.xml');

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
  let originalLog = console.log;
  beforeAll(() => (console.log = () => {}));
  afterAll(() => (console.log = originalLog));
  it(`ensure manifest has valid intent filter added`, async () => {
    const manifest = await Manifest.readAsync(manifestPath);
    const manifestHasValidIntentFilter = await Schemes.ensureManifestHasValidIntentFilter(manifest);
    expect(manifestHasValidIntentFilter).toBe(true);
  });
  it(`throws an error if no singleTask Activity exists`, async () => {
    const manifest = await Manifest.readAsync(manifestPath);
    removeSingleTaskFromActivities(manifest);

    await expect(
      Schemes.modifySchemesAsync(
        { manifest },
        { uri: 'myapp.test' },
        { operation: 'add', dryRun: true }
      )
    ).rejects.toThrowError(
      /Cannot add scheme \"myapp.test\" because the provided manifest does not have a valid Activity with `android:launchMode=\"singleTask\"`/
    );
  });
  it(`adds and removes a new scheme`, async () => {
    const manifest = await Manifest.readAsync(manifestPath);
    const modifiedManifest = await Schemes.modifySchemesAsync(
      { manifest },
      { uri: 'myapp.test' },
      { operation: 'add', dryRun: true }
    );
    const schemes = await Schemes.getSchemesAsync({ manifest: modifiedManifest });
    expect(schemes).toContain('myapp.test');

    const removedManifest = await Schemes.modifySchemesAsync(
      { manifest },
      { uri: 'myapp.test' },
      { operation: 'remove', dryRun: true }
    );

    expect(await Schemes.getSchemesAsync({ manifest: removedManifest })).not.toContain(
      'myapp.test'
    );
  });
  it(`throw when a duplicate might be added`, async () => {
    const manifest = await Manifest.readAsync(manifestPath);
    const modifiedManifest = await Schemes.modifySchemesAsync(
      { manifest },
      { uri: 'myapp.test' },
      { operation: 'add', dryRun: true }
    );

    await expect(
      Schemes.modifySchemesAsync(
        { manifest: modifiedManifest },
        { uri: 'myapp.test' },
        { operation: 'add', dryRun: true }
      )
    ).rejects.toThrowError(/\"myapp.test\" already exist/);
  });
  it(`throw when a non-existent scheme might be removed`, async () => {
    const manifest = await Manifest.readAsync(manifestPath);
    await expect(
      Schemes.modifySchemesAsync(
        { manifest },
        { uri: 'myapp.test' },
        { operation: 'remove', dryRun: true }
      )
    ).rejects.toThrowError(/\"myapp.test\" does not exist/);
  });
});
