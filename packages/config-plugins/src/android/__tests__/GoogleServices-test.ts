import fs from 'fs-extra';
import { resolve } from 'path';

import {
  applyPlugin,
  getGoogleServicesFilePath,
  setClassPath,
  setGoogleServicesFile,
} from '../GoogleServices';

jest.mock('fs');
const fixturesPath = resolve(__dirname, 'fixtures');

describe('google services file', () => {
  afterAll(async () => {
    await fs.remove(resolve(fixturesPath, 'not/'));
  });

  it(`returns null if no googleServicesFile is provided`, () => {
    expect(getGoogleServicesFilePath({})).toBe(null);
  });

  it(`returns googleServicesFile path if provided`, () => {
    expect(
      getGoogleServicesFilePath({
        android: {
          googleServicesFile: 'path/to/google-services.json',
        },
      })
    ).toBe('path/to/google-services.json');
  });

  it(`copies google services file to android/app`, async () => {
    expect(
      await setGoogleServicesFile(
        {
          android: {
            googleServicesFile: './google-services.json',
          },
        },
        fixturesPath
      )
    ).toBe(true);

    expect(fs.copy).toHaveBeenCalledWith(
      resolve(fixturesPath, 'google-services.json'),
      resolve(fixturesPath, 'android/app/google-services.json')
    );
  });

  it(`copies google services file to custom target path`, async () => {
    const customTargetPath = './not/sure/why/youd/do/this/google-services.json';
    expect(
      await setGoogleServicesFile(
        {
          android: {
            googleServicesFile: './google-services.json',
          },
        },
        fixturesPath,
        customTargetPath
      )
    ).toBe(true);

    expect(fs.copy).toHaveBeenCalledWith(
      resolve(fixturesPath, 'google-services.json'),
      resolve(fixturesPath, customTargetPath)
    );
  });

  describe('setting classpath', () => {
    const validConfig = { android: { googleServicesFile: 'g.json' } };
    const EXAMPLE_BUILD_GRADLE = `
buildscript {
    ext {
        buildToolsVersion = "28.0.3"
    }
    repositories {
        google()
        jcenter()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:3.5.3'

    }
}
  `;

    const EXPECTED_BUILD_GRADLE = `
buildscript {
    ext {
        buildToolsVersion = "28.0.3"
    }
    repositories {
        google()
        jcenter()
    }
    dependencies {
        classpath 'com.google.gms:google-services:4.3.3'
        classpath 'com.android.tools.build:gradle:3.5.3'

    }
}
  `;
    it(`sets classpath in build.gradle if needed`, () => {
      expect(setClassPath(validConfig, EXAMPLE_BUILD_GRADLE)).toEqual(EXPECTED_BUILD_GRADLE);
    });

    it(`does not set classpath in build.gradle multiple times`, () => {
      expect(setClassPath(validConfig, EXPECTED_BUILD_GRADLE)).toEqual(EXPECTED_BUILD_GRADLE);
    });
  });

  describe('applying plugin', () => {
    const validConfig = { android: { googleServicesFile: 'g.json' } };
    const EXAMPLE_APP_BUILD_GRADLE = `
// Blah blah blah
task copyDownloadableDepsToLibs(type: Copy) {
    from configurations.compile
    into 'libs'
}

apply from: file("../../node_modules/@react-native-community/cli-platform-android/native_modules.gradle");
applyNativeModulesAppBuildGradle(project)`;

    const EXPECTED_APP_BUILD_GRADLE = `
// Blah blah blah
task copyDownloadableDepsToLibs(type: Copy) {
    from configurations.compile
    into 'libs'
}

apply from: file("../../node_modules/@react-native-community/cli-platform-android/native_modules.gradle");
applyNativeModulesAppBuildGradle(project)
apply plugin: 'com.google.gms.google-services'`;

    it(`applies the plugin in app/build.gradle if needed`, () => {
      expect(applyPlugin(validConfig, EXAMPLE_APP_BUILD_GRADLE)).toEqual(EXPECTED_APP_BUILD_GRADLE);
    });

    it(`does not apply the plugin multiple times`, () => {
      expect(applyPlugin(validConfig, EXPECTED_APP_BUILD_GRADLE)).toEqual(
        EXPECTED_APP_BUILD_GRADLE
      );
    });
  });
});
