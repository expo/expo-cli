import { getVersionCode, getVersionName, setVersionCode, setVersionName } from '../Version';

// TODO: use fixtures for manifest/build.gradle instead of inline strings

const EXAMPLE_BUILD_GRADLE = `
android {
    compileSdkVersion rootProject.ext.compileSdkVersion
    buildToolsVersion rootProject.ext.buildToolsVersion

    defaultConfig {
        applicationId "com.helloworld"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.2.3"
    }
}
`;

const EXAMPLE_BUILD_GRADLE_2 = `
android {
    compileSdkVersion rootProject.ext.compileSdkVersion
    buildToolsVersion rootProject.ext.buildToolsVersion

    defaultConfig {
        applicationId "com.helloworld"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 4
        versionName "2.0"
    }
}
`;

describe('versionName', () => {
  it(`returns null if no version is provided`, () => {
    expect(getVersionName({})).toBe(null);
  });

  it(`returns the version name if provided`, () => {
    expect(getVersionName({ version: '1.2.3' })).toBe('1.2.3');
  });

  it(`sets the version name in build.gradle if version name is given`, () => {
    expect(setVersionName({ version: '1.2.3' }, EXAMPLE_BUILD_GRADLE)).toMatch(
      'versionName "1.2.3"'
    );
  });

  it(`replaces provided version name in build.gradle if version name is not the default`, () => {
    expect(setVersionName({ version: '1.2.3' }, EXAMPLE_BUILD_GRADLE_2)).toMatch(
      'versionName "1.2.3"'
    );
  });
});

describe('versionCode', () => {
  it(`returns the version code if provided`, () => {
    expect(getVersionCode({ android: { versionCode: 5 } })).toBe(5);
  });

  it(`sets the version code in build.gradle if version code is given`, () => {
    expect(setVersionCode({ android: { versionCode: 5 } }, EXAMPLE_BUILD_GRADLE)).toMatch(
      'versionCode 5'
    );
  });

  it(`replaces provided version code in build.gradle if version code is given`, () => {
    expect(setVersionCode({ android: { versionCode: 5 } }, EXAMPLE_BUILD_GRADLE_2)).toMatch(
      'versionCode 5'
    );
  });
});
