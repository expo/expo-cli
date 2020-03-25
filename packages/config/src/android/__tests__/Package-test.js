import { dirname, resolve } from 'path';
import fs from 'fs-extra';
import { getPackage, setPackageInAndroidManifest, setPackageInBuildGradle } from '../Package';
import { readAndroidManifestAsync } from '../Manifest';

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

  it(`sets the applicationId in build.gradle if package is given`, () => {
    expect(
      setPackageInBuildGradle({ android: { package: 'my.new.app' } }, EXAMPLE_BUILD_GRADLE)
    ).toMatch("applicationId 'my.new.app'");
  });

  describe('sets the package in AndroidManifest.xml if package is given', () => {
    const projectDirectory = resolve(fixturesPath, 'tmp/');
    const appManifestPath = resolve(fixturesPath, 'tmp/android/app/src/main/AndroidManifest.xml');

    beforeAll(async () => {
      await fs.ensureDir(dirname(appManifestPath));
      await fs.copyFile(sampleManifestPath, appManifestPath);
    });

    afterAll(async () => {
      await fs.remove(resolve(fixturesPath, 'tmp/'));
    });

    it('adds package to android manifest', async () => {
      expect(
        await setPackageInAndroidManifest(
          { android: { package: 'com.test.package' } },
          projectDirectory
        )
      ).toBe(true);
      let androidManifestJson = await readAndroidManifestAsync(appManifestPath);
      expect(androidManifestJson['manifest']['$']['package']).toMatch('com.test.package');
    });
  });
});
