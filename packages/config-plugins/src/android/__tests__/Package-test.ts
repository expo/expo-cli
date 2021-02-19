import { resolve } from 'path';

import { readAndroidManifestAsync } from '../Manifest';
import {
  getApplicationIdAsync,
  getPackage,
  setPackageInAndroidManifest,
  setPackageInBuildGradle,
} from '../Package';

const fixturesPath = resolve(__dirname, 'fixtures');
const sampleManifestPath = resolve(fixturesPath, 'react-native-AndroidManifest.xml');

const EXAMPLE_BUILD_GRADLE = `
  android {
      compileSdkVersion rootProject.ext.compileSdkVersion
      buildToolsVersion rootProject.ext.buildToolsVersion
  
      defaultConfig {
          applicationId "com.helloworld"
          minSdkVersion rootProject.ext.minSdkVersion
          targetSdkVersion rootProject.ext.targetSdkVersion
          versionCode 1
          versionName "1.0"
      }
  }
  `;

describe('package', () => {
  it(`returns null if no package is provided`, () => {
    expect(getPackage({})).toBe(null);
  });

  it(`returns the package if provided`, () => {
    expect(getPackage({ android: { package: 'com.example.xyz' } })).toBe('com.example.xyz');
  });

  it(`returns the applicationId defined in build.gradle`, () => {
    expect(getApplicationIdAsync(fixturesPath)).resolves.toBe('com.helloworld');
  });

  it(`sets the applicationId in build.gradle if package is given`, () => {
    expect(
      setPackageInBuildGradle({ android: { package: 'my.new.app' } }, EXAMPLE_BUILD_GRADLE)
    ).toMatch("applicationId 'my.new.app'");
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
