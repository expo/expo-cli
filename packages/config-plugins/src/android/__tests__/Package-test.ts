import { resolve } from 'path';

import { readAndroidManifestAsync } from '../Manifest';
import { getPackage, setPackageInAndroidManifest } from '../Package';

const fixturesPath = resolve(__dirname, 'fixtures');
const sampleManifestPath = resolve(fixturesPath, 'react-native-AndroidManifest.xml');

describe('package', () => {
  it(`returns null if no package is provided`, () => {
    expect(getPackage({})).toBe(null);
  });

  it(`returns the package if provided`, () => {
    expect(getPackage({ android: { package: 'com.example.xyz' } })).toBe('com.example.xyz');
  });

  it('adds package to android manifest', async () => {
    let androidManifestJson = await readAndroidManifestAsync(sampleManifestPath);
    androidManifestJson = await setPackageInAndroidManifest(
      { android: { package: 'com.test.package' } },
      androidManifestJson
    );

    expect(androidManifestJson.manifest.$.package).toMatch('com.test.package');
  });
});
