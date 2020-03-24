import { getPackage, setPackageInAndroidManifest, setPackageInBuildGradle } from '../Package';

// TODO: use fixtures for manifest/build.gradle instead of inline strings

const EXAMPLE_ANDROID_MANIFEST = `
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.helloworld">
    <application
    android:name=".MainApplication"
    android:label="@string/app_name"
    android:icon="@mipmap/ic_launcher"
    android:roundIcon="@mipmap/ic_launcher_round"
    android:allowBackup="false"
    android:theme="@style/AppTheme">
    <activity
      android:name=".MainActivity"
      android:label="@string/app_name"
      android:configChanges="keyboard|keyboardHidden|orientation|screenSize"
      android:windowSoftInputMode="adjustResize">
      <intent-filter>
          <action android:name="android.intent.action.MAIN" />
          <category android:name="android.intent.category.LAUNCHER" />
      </intent-filter>
    </activity>
    <activity android:name="com.facebook.react.devsupport.DevSettingsActivity" />
  </application>

</manifest>
`;

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

  it(`sets the android:name in AndroidManifest.xml if package is given`, () => {
    expect(
      setPackageInAndroidManifest({ android: { package: 'my.new.app' } }, EXAMPLE_ANDROID_MANIFEST)
    ).toMatch('package="my.new.app"');
  });

  // TODO: add test cases for passing in a different package name to replace in third param
});
