import JsonFile from '@expo/json-file';
import fs from 'fs-extra';
import { vol } from 'memfs';
import * as path from 'path';
import xcode from 'xcode';

import { ExportedConfig } from '../../Plugin.types';
import { withBranch } from '../../ios/Branch';
import { getDirFromFS } from '../../ios/__tests__/utils/getDirFromFS';
import { readXMLAsync } from '../../utils/XML';
import {
  withExpoAndroidPlugins,
  withExpoIOSPlugins,
  withExpoVersionedSDKPlugins,
} from '../expo-plugins';
import { compileModsAsync, evalModsAsync } from '../mod-compiler';
import rnFixture from './fixtures/react-native-project';

const fsReal = jest.requireActual('fs') as typeof fs;

jest.mock('fs');
// Weird issues with Android Icon module make it hard to mock test.
jest.mock('../../android/Icon', () => {
  return {
    withIcons(config) {
      return config;
    },
    setIconAsync() {},
  };
});
const NotificationsPlugin = require('../../android/Notifications');
NotificationsPlugin.withNotificationIcons = jest.fn(config => config);

describe(evalModsAsync, () => {
  it(`runs with no core mods`, async () => {
    let config: ExportedConfig = {
      name: 'app',
      slug: '',
    };
    config = await evalModsAsync(config, { projectRoot: '/' });
    expect(config.ios).toBeUndefined();
  });
});

describe('built-in plugins', () => {
  const projectRoot = '/app';
  const iconPath = path.resolve(__dirname, '../../ios/__tests__/fixtures/icons/icon.png');

  beforeEach(async () => {
    const icon = fsReal.readFileSync(iconPath) as any;
    // Trick XDL Info.plist reading
    Object.defineProperty(process, 'platform', {
      value: 'not-darwin',
    });
    vol.fromJSON(
      {
        ...rnFixture,
        'config/GoogleService-Info.plist': 'noop',
        'config/google-services.json': '{}',
        './icons/foreground.png': icon,
        './icons/background.png': icon,
        './icons/notification-icon.png': icon,
        './icons/ios-icon.png': icon,
        'locales/en-US.json': JSON.stringify({ foo: 'uhh bar', fallback: 'fallback' }, null, 2),
      },
      projectRoot
    );
  });

  afterEach(() => {
    vol.reset();
  });

  // Ensure helpful error messages are thrown
  it(`fails to locate the project name in an invalid project`, async () => {
    const config = withBranch({
      name: 'app',
      slug: '',
      ios: {},
    });
    await expect(compileModsAsync(config, { projectRoot: '/invalid' })).rejects.toThrow(
      'Failed to locate Info.plist files relative'
    );
  });

  it(`skips platforms`, async () => {
    const config = withBranch({
      name: 'app',
      slug: '',
      ios: {},
    });
    // should throw if the platform isn't skipped
    await compileModsAsync(config, { projectRoot: '/invalid', platforms: ['android'] });
  });

  it('prefers named keys over info.plist overrides', async () => {
    let config: ExportedConfig = {
      name: 'app',
      slug: '',
      _internal: { projectRoot: '.' },
      ios: {
        config: {
          usesNonExemptEncryption: false,
        },
        infoPlist: {
          ITSAppUsesNonExemptEncryption: true,
        },
      },
    };

    config = withExpoIOSPlugins(config, {
      bundleIdentifier: 'com.bacon.todo',
    });
    // Apply mod
    config = await compileModsAsync(config, { projectRoot: '/app' });
    // This should be false because ios.config.usesNonExemptEncryption is used in favor of ios.infoPlist.ITSAppUsesNonExemptEncryption
    expect(config.ios?.infoPlist?.ITSAppUsesNonExemptEncryption).toBe(false);
  });

  it('compiles mods', async () => {
    let config: ExportedConfig = {
      name: 'my cool app',
      slug: 'mycoolapp',
      description: 'my app is great because it uses expo',
      // owner?: string;
      // privacy?: 'public' | 'unlisted' | 'hidden';
      // sdkVersion?: string;
      // runtimeVersion?: string;
      version: '1.0.0',
      platforms: ['android', 'ios', 'web'],
      githubUrl: 'https://github.com/expo/expo',
      orientation: 'default',
      userInterfaceStyle: 'dark',
      backgroundColor: 'orange',
      primaryColor: '#fff000',
      // icon: './icons/icon.png',
      notification: {
        icon: './icons/notification-icon.png',
        color: 'green',
        iosDisplayInForeground: true,
        androidMode: 'collapse',
        androidCollapsedTitle: '#{unread_notifications} new interactions',
      },
      appKey: 'othermain',
      androidStatusBar: {
        barStyle: 'light-content',
        backgroundColor: '#000FFF',
        hidden: false,
        translucent: true,
      },
      androidNavigationBar: {
        visible: 'sticky-immersive',
        barStyle: 'dark-content',

        backgroundColor: '#ff0000',
      },
      developmentClient: {
        silentLaunch: true,
      },
      scheme: 'my-app-redirect',
      packagerOpts: {
        extraThing: true,
      },
      updates: {
        enabled: true,
        checkAutomatically: 'ON_ERROR_RECOVERY',
        fallbackToCacheTimeout: 650,
      },
      locales: {
        en: './locales/en-US.json',
        es: { foo: 'el bar' },
      },
      facebookAppId: '1234567890',
      facebookAutoInitEnabled: true,
      facebookAutoLogAppEventsEnabled: true,
      facebookAdvertiserIDCollectionEnabled: true,
      facebookDisplayName: 'my-fb-test-app',
      facebookScheme: 'fb1234567890',
      ios: {
        bundleIdentifier: 'com.bacon.tester.expoapp',
        buildNumber: '6.5.0',
        backgroundColor: '#ff0000',
        merchantId: 'TEST_MERCHANT_ID',
        appStoreUrl: 'https://itunes.apple.com/us/app/pillar-valley/id1336398804?ls=1&mt=8',
        config: {
          branch: {
            apiKey: 'MY_BRANCH_KEY',
          },
          usesNonExemptEncryption: true,
          googleMapsApiKey: 'TEST_googleMapsApiKey',
          googleMobileAdsAppId: 'TEST_googleMobileAdsAppId',
          googleMobileAdsAutoInit: true,
          googleSignIn: {
            reservedClientId: 'GOOGLE_SIGN_IN_CLIENT_ID',
          },
        },
        googleServicesFile: './config/GoogleService-Info.plist',
        supportsTablet: true,
        isTabletOnly: false,
        requireFullScreen: true,
        userInterfaceStyle: 'automatic',
        infoPlist: { bar: { val: ['foo'] } },
        entitlements: { foo: 'bar' },
        associatedDomains: ['applinks:https://pillarvalley.netlify.app'],
        usesIcloudStorage: true,
        usesAppleSignIn: true,
        accessesContactNotes: true,
      },
      android: {
        package: 'com.bacon.tester.expoapp',
        versionCode: 6,
        backgroundColor: '#ff0000',
        userInterfaceStyle: 'light',
        adaptiveIcon: {
          foregroundImage: './icons/foreground.png',
          backgroundImage: './icons/background.png',
        },
        permissions: ['CAMERA', 'com.sec.android.provider.badge.permission.WRITE'],
        googleServicesFile: './config/google-services.json',
        config: {
          branch: {
            apiKey: 'MY_BRANCH_ANDROID_KEY',
          },
          googleMaps: {
            apiKey: 'MY_GOOGLE_MAPS_ANDROID_KEY',
          },
          googleMobileAdsAppId: 'MY_GOOGLE_MOBILE_ADS_APP_ID',
          googleMobileAdsAutoInit: true,
        },
        intentFilters: [
          {
            autoVerify: true,
            action: 'VIEW',
            data: {
              scheme: 'https',
              host: '*.expo.io',
            },
            category: ['BROWSABLE', 'DEFAULT'],
          },
        ],
        allowBackup: true,
        softwareKeyboardLayoutMode: 'pan',
      },
      _internal: { projectRoot: '/app' },
      mods: null,
    };

    config = withExpoVersionedSDKPlugins(config, { expoUsername: 'bacon' });

    config = withExpoIOSPlugins(config, {
      bundleIdentifier: 'com.bacon.todo',
    });
    config = withExpoAndroidPlugins(config, {
      package: 'com.bacon.todo',
    });

    // Apply mod
    config = await compileModsAsync(config, { projectRoot: '/app' });

    // App config should have been modified
    expect(config.name).toBe('my cool app');
    expect(config.ios.infoPlist).toBeDefined();
    expect(config.ios.entitlements).toBeDefined();

    // Google Sign In
    expect(
      config.ios?.infoPlist?.CFBundleURLTypes?.find(({ CFBundleURLSchemes }) =>
        CFBundleURLSchemes.includes('GOOGLE_SIGN_IN_CLIENT_ID')
      )
    ).toBeDefined();
    // Branch
    expect(config.ios?.infoPlist?.branch_key?.live).toBe('MY_BRANCH_KEY');

    // Mods should all be functions
    expect(Object.values(config.mods.ios).every(value => typeof value === 'function')).toBe(true);

    delete config.mods;

    // Shape
    expect(config).toMatchSnapshot();

    // Test the written files...
    const after = getDirFromFS(vol.toJSON(), projectRoot);

    expect(Object.keys(after)).toStrictEqual([
      'ios/ReactNativeProject/Info.plist',
      'ios/ReactNativeProject/AppDelegate.m',
      'ios/ReactNativeProject/Base.lproj/LaunchScreen.xib',
      'ios/ReactNativeProject/Images.xcassets/AppIcon.appiconset/Contents.json',
      'ios/ReactNativeProject/Images.xcassets/Contents.json',
      'ios/ReactNativeProject/Supporting/en.lproj/InfoPlist.strings',
      'ios/ReactNativeProject/Supporting/es.lproj/InfoPlist.strings',
      'ios/ReactNativeProject/GoogleService-Info.plist',
      'ios/ReactNativeProject/ReactNativeProject-Bridging-Header.h',
      'ios/ReactNativeProject/ReactNativeProject.entitlements',
      'ios/ReactNativeProject.xcodeproj/project.pbxproj',
      'android/app/src/main/java/com/bacon/todo/MainActivity.java',
      'android/app/src/main/java/com/bacon/todo/MainApplication.java',
      'android/app/src/main/AndroidManifest.xml',
      'android/app/src/main/res/values/styles.xml',
      'android/app/src/main/res/values/colors.xml',
      'android/app/src/main/res/values/strings.xml',
      'android/app/build.gradle',
      'android/app/google-services.json',
      'android/settings.gradle',
      'android/build.gradle',
      'config/GoogleService-Info.plist',
      'config/google-services.json',
      'locales/en-US.json',
    ]);

    expect(after['ios/ReactNativeProject/ReactNativeProject.entitlements']).toMatch(
      'com.apple.developer.associated-domains'
    );

    expect(after['ios/ReactNativeProject/Info.plist']).toMatch(/com.bacon.todo/);
    expect(after['ios/ReactNativeProject/Supporting/en.lproj/InfoPlist.strings']).toMatch(
      /foo = "uhh bar"/
    );
    expect(after['ios/ReactNativeProject/GoogleService-Info.plist']).toBe('noop');

    expect(after['android/app/src/main/java/com/bacon/todo/MainApplication.java']).toMatch(
      'package com.bacon.todo;'
    );
    expect(after['android/app/src/main/java/com/bacon/todo/MainActivity.java']).toMatch(
      '// Added automatically by Expo Config'
    );
    expect(after['android/app/src/main/res/values/strings.xml']).toMatch(
      '<string name="app_name">my cool app</string>'
    );

    // Ensure files are always written in the correct format
    for (const xmlPath of [
      'android/app/src/main/AndroidManifest.xml',
      'android/app/src/main/res/values/styles.xml',
      'android/app/src/main/res/values/strings.xml',
      'android/app/src/main/res/values/colors.xml',
      'ios/ReactNativeProject/Info.plist',
      'ios/ReactNativeProject/Base.lproj/LaunchScreen.xib',
    ]) {
      const isValid = await isValidXMLAsync(path.join(projectRoot, xmlPath));
      if (!isValid) throw new Error(`Invalid XML file format at: "${xmlPath}"`);
    }

    // Ensure files are always written in the correct format
    for (const xmlPath of [
      'ios/ReactNativeProject/Images.xcassets/AppIcon.appiconset/Contents.json',
      'ios/ReactNativeProject/Images.xcassets/Contents.json',
      'android/app/google-services.json',
    ]) {
      const isValid = await isValidJSONAsync(path.join(projectRoot, xmlPath));
      if (!isValid) throw new Error(`Invalid JSON file format at: "${xmlPath}"`);
    }

    // Ensure the Xcode project file can be read and parsed.
    const project = xcode.project(
      path.join(projectRoot, 'ios/ReactNativeProject.xcodeproj/project.pbxproj')
    );
    project.parseSync();
  });
});

async function isValidXMLAsync(filePath: string) {
  try {
    const res = await readXMLAsync({ path: filePath });
    return !!res;
  } catch {
    return false;
  }
}
async function isValidJSONAsync(filePath: string) {
  try {
    const res = await JsonFile.readAsync(filePath);
    return !!res;
  } catch {
    return false;
  }
}
