import fs from 'fs-extra';
import { vol } from 'memfs';
import * as path from 'path';

import { ExportedConfig } from '../../Plugin.types';
import { getDirFromFS } from '../../ios/__tests__/utils/getDirFromFS';
import { withExpoIOSPlugins } from '../expo-plugins';
import { compileModifiersAsync, evalModifiersAsync } from '../modifier-compiler';
import rnFixture from './fixtures/react-native-project';
const actualFs = jest.requireActual('fs') as typeof fs;

jest.mock('fs');

jest.mock('@expo/image-utils', () => ({
  generateImageAsync(input, { src }) {
    const fs = require('fs');
    return { source: fs.readFileSync(src) };
  },
  compositeImagesAsync({ foreground }) {
    return foreground;
  },
}));

afterAll(() => {
  jest.unmock('@expo/image-utils');
  jest.unmock('fs');
});

describe(evalModifiersAsync, () => {
  it(`runs with no core modifiers`, async () => {
    let config: ExportedConfig = {
      expo: {
        name: 'app',
        slug: '',
      },
    };
    config = await evalModifiersAsync(config, { projectRoot: '/' });
    expect(config.expo.ios).toBeUndefined();
  });
});

describe(withExpoIOSPlugins, () => {
  const projectRoot = '/app';
  const iconPath = path.resolve(__dirname, '../../ios/__tests__/fixtures/icons/icon.png');

  beforeEach(async () => {
    const icon = actualFs.readFileSync(iconPath) as any;
    // Trick XDL Info.plist reading
    Object.defineProperty(process, 'platform', {
      value: 'not-darwin',
    });
    vol.fromJSON(
      {
        ...rnFixture,
        'config/GoogleService-Info.plist': 'noop',
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
    const config = {
      expo: {
        name: 'app',
        slug: '',
        ios: {},
      },
    };
    await expect(compileModifiersAsync(config, '/invalid')).rejects.toThrow(
      'Could not locate a valid AppDelegate at root'
    );
  });

  it('prefers named keys over info.plist overrides', async () => {
    let config: ExportedConfig = {
      expo: {
        name: 'app',
        slug: '',
        ios: {
          config: {
            usesNonExemptEncryption: false,
          },
          infoPlist: {
            ITSAppUsesNonExemptEncryption: true,
          },
        },
      },
    };

    config = withExpoIOSPlugins(config, {
      bundleIdentifier: 'com.bacon.todo',
      expoUsername: 'bacon',
    });
    // Apply modifier
    config = await compileModifiersAsync(config, '/app');
    // This should be false because ios.config.usesNonExemptEncryption is used in favor of ios.infoPlist.ITSAppUsesNonExemptEncryption
    expect(config.expo.ios?.infoPlist?.ITSAppUsesNonExemptEncryption).toBe(false);
  });

  it('compiles modifiers', async () => {
    let config: ExportedConfig = {
      expo: {
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
        // entryPoint: './index.js',
        // rnCliPath?: string;
        packagerOpts: {
          extraThing: true,
        },
        // ignoreNodeModulesValidation?: boolean;
        // nodeModulesPath?: string;
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
          // publishManifestPath: './ios-manifest'
          publishBundlePath: './ios-dist',
          bundleIdentifier: 'com.bacon.tester.expoapp',
          buildNumber: '6.5.0',
          backgroundColor: '#ff0000',
          // icon: './icons/ios-icon.png',
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
      },
      modifiers: null,
    };

    config = withExpoIOSPlugins(config, {
      bundleIdentifier: 'com.bacon.todo',
      expoUsername: 'bacon',
    });

    // Apply modifier
    config = await compileModifiersAsync(config, '/app');

    // App config should have been modified
    expect(config.expo.name).toBe('my cool app');
    expect(config.expo.ios.infoPlist).toBeDefined();
    expect(config.expo.ios.entitlements).toBeDefined();

    // Google Sign In
    expect(
      config.expo.ios?.infoPlist?.CFBundleURLTypes?.find(({ CFBundleURLSchemes }) =>
        CFBundleURLSchemes.includes('GOOGLE_SIGN_IN_CLIENT_ID')
      )
    ).toBeDefined();
    // Branch
    expect(config.expo.ios?.infoPlist?.branch_key?.live).toBe('MY_BRANCH_KEY');

    // Shape
    expect(config.expo).toMatchSnapshot();

    // Modifiers should all be functions
    expect(Object.values(config.modifiers.ios).every(value => typeof value === 'function')).toBe(
      true
    );

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
      'ios/ReactNativeProject/$(TARGET_NAME).entitlements',
      'ios/ReactNativeProject.xcodeproj/project.pbxproj',
      'config/GoogleService-Info.plist',
      'locales/en-US.json',
    ]);

    expect(after['ios/ReactNativeProject/$(TARGET_NAME).entitlements']).toMatch(
      'com.apple.developer.associated-domains'
    );

    expect(after['ios/ReactNativeProject/Info.plist']).toMatch(/com.bacon.todo/);
    expect(after['ios/ReactNativeProject/Supporting/en.lproj/InfoPlist.strings']).toMatch(
      /foo = \"uhh bar\"/
    );
    expect(after['ios/ReactNativeProject/GoogleService-Info.plist']).toBe('noop');
  });
});
