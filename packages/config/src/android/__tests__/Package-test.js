import { fs, vol } from 'memfs';
import {
  getPackage,
  renamePackageOnDisk,
  setPackageInAndroidManifest,
  setPackageInBuildGradle,
} from '../Package';
import { readAndroidManifestAsync } from '../Manifest';

jest.mock('fs');

// It's kind of silly how much work is necessary to use memfs in the same file
// as a test where you do not want to mock the fs
jest.mock('../Manifest', () => ({
  readAndroidManifestAsync: () => {
    const path = jest.requireActual('path');
    const fs = jest.requireActual('fs');
    const { Parser } = jest.requireActual('xml2js');
    const fixturesPath = path.resolve(process.cwd(), 'src', 'android', '__tests__', 'fixtures');
    const sampleManifestPath = path.resolve(fixturesPath, 'react-native-AndroidManifest.xml');
    const contents = fs.readFileSync(sampleManifestPath).toString();
    const parser = new Parser();
    const manifest = parser.parseStringPromise(contents);
    return manifest;
  },
}));

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
  describe('getters and setters', () => {
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

    it('adds package to android manifest', async () => {
      let androidManifestJson = await readAndroidManifestAsync('AndroidManifest.xml');
      androidManifestJson = await setPackageInAndroidManifest(
        { android: { package: 'com.test.package' } },
        androidManifestJson
      );

      expect(androidManifestJson['manifest']['$']['package']).toMatch('com.test.package');
    });
  });

  describe('renamePackageOnDisk', () => {
    const EXAMPLE_MAIN_APPLICATION = `
package com.lololol;

public class MainApplication extends Application implements ReactApplication {
}
`;

    const EXAMPLE_MAIN_ACTIVITY = `
package com.lololol;

public class MainActivity extends ReactActivity {
}
`;

    const EXAMPLE_NESTED_CLASS = `
package com.lololol.example;
import com.lololol.example.hi.other;

public class SomeClass {
}
`;

    beforeEach(async () => {
      const directoryJSON = {
        './android/app/BUCK': 'package = "com.lololol"',
        './android/app/src/main/java/com/lololol/MainApplication.java': EXAMPLE_MAIN_APPLICATION,
        './android/app/src/main/java/com/lololol/MainActivity.java': EXAMPLE_MAIN_ACTIVITY,
        './android/app/src/main/java/com/lololol/example/SomeClass.java': EXAMPLE_NESTED_CLASS,
      };
      vol.fromJSON(directoryJSON, '/myapp');
    });

    afterEach(() => vol.reset());

    it('re-creates the directory structure and replaces occurrences of old package in files', () => {
      renamePackageOnDisk({ android: { package: 'xyz.bront.app' } }, '/myapp');
      let mainActivityPath = '/myapp/android/app/src/main/java/xyz/bront/app/MainActivity.java';
      expect(fs.existsSync(mainActivityPath)).toBeTruthy();
      expect(fs.readFileSync(mainActivityPath).toString()).toMatch('package xyz.bront.app');

      let nestedClassPath = '/myapp/android/app/src/main/java/xyz/bront/app/example/SomeClass.java';
      expect(fs.existsSync(nestedClassPath)).toBeTruthy();
      expect(fs.readFileSync(nestedClassPath).toString()).toMatch('package xyz.bront.app');
      expect(fs.readFileSync(nestedClassPath).toString()).not.toMatch('com.lololol');

      let buckPath = '/myapp/android/app/BUCK';
      expect(fs.readFileSync(buckPath).toString()).toMatch('package = "xyz.bront.app"');
      expect(fs.readFileSync(buckPath).toString()).not.toMatch('com.lololol');
    });
  });
});
