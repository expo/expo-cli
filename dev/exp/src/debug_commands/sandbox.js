/**
 * @flow
 */

import { User, UserSettings, UrlUtils } from 'xdl';
import path from 'path';
import rimraf from 'rimraf';
import mkdirp from 'mkdirp';
import fs from 'fs';

import IOSBuilder from '../commands/build/IOSBuilder';

const HOME_APP_JSON = {
  expo: {
    name: 'expo-home',
    description: '',
    slug: 'home',
    privacy: 'unlisted',

    // When publishing the sdkVersion needs to be set to the target sdkVersion.
    // The Exponent client will load it as UNVERSIONED, but the server uses this field
    // to know which clients to serve the bundle to.
    sdkVersion: '26.0.0',

    // Update this each time you publish so you're able to relate published
    // bundles to specific commits in the repo
    version: '26.1.0',

    orientation: 'portrait',
    platforms: ['ios', 'android'],
    primaryColor: '#cccccc',
    icon: 'https://s3.amazonaws.com/exp-brand-assets/ExponentEmptyManifest_192.png',
    updates: {
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 0,
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: 'host.exp.exponent',
      publishBundlePath: '../ios/Exponent/Supporting/kernel.ios.bundle',
      config: {
        actualBundleIdentifier: 'REPLACEME',
      },
    },
    android: {
      package: 'host.exp.exponent',
      publishBundlePath: '../android/app/src/main/assets/kernel.android.bundle',
    },
    scheme: 'exp',
    isKernel: true,
    kernel: {
      iosManifestPath: '../ios/Exponent/Supporting/kernel-manifest.json',
      androidManifestPath: '../android/app/src/main/assets/kernel-manifest.json',
    },
    extra: {
      amplitudeApiKey: '081e5ec53f869b440b225d5e40ec73f9',
    },
  },
};

const HOME_PKG_JSON = {
  main: 'node_modules/expo/AppEntry.js',
  private: true,
  description: 'The Expo app',
  scripts: {
    test: 'jest',
  },
  author: '650 Industries',
  license: 'Copyright 650 Industries, Inc. All rights reserved.',
  jest: {
    preset: 'jest-expo',
  },
  powertools: {
    group: 'client',
  },
  dependencies: {
    '@expo/ex-navigation': '^2.11.1',
    '@expo/react-native-action-sheet': '^0.3.0',
    '@expo/react-native-fade-in-image': '^1.1.1',
    '@expo/react-native-navigator': '0.5.2',
    '@expo/react-native-responsive-image': '^1.2.1',
    '@expo/react-native-touchable-native-feedback-safe': '^1.1.1',
    'apollo-client': '~1.0.3',
    'autobind-decorator': '^1.3.2',
    dedent: '^0.7.0',
    'es6-error': '^4.0.1',
    expo: '26.0.0-rc.2',
    'graphql-tag': '^1.2.1',
    immutable: '^3.8.1',
    'jwt-decode': '^2.1.0',
    lodash: '^4.17.4',
    'prop-types': '^15.5.10',
    querystring: '^0.2.0',
    react: '16.2.0',
    'react-apollo': '~1.0.1',
    'react-mixin': '^3.0.4',
    'react-native': 'expo/react-native#sdk-26',
    'react-native-deprecated-custom-components': '^0.1.0',
    'react-native-infinite-scroll-view': '^0.4.2',
    'react-redux': '^5.0.1',
    'react-timer-mixin': '^0.13.3',
    redux: '^3.5.1',
    'redux-thunk': '^2.2.0',
    url: '^0.11.0',
  },
  devDependencies: {
    hashids: '^1.1.1',
    'jest-expo': '^25.1.0',
    'jsc-android': '^216113.0.0',
    'node-fetch': '^2.0.0',
    uuid: '^3.0.1',
  },
};

export default (program: any) => {
  program
    .command('sandbox:ios')
    .alias('si')
    .option('-c, --clear-credentials', 'Clear credentials stored on expo servers')
    .option('-e, --apple-enterprise-account', 'Run as Apple Enterprise account')
    .option('--no-wait', 'Exit immediately after triggering build.')
    .description('Build a signed IPA of the Expo sandbox app')
    .asyncAction(async options => {
      const user = await User.ensureLoggedInAsync();
      const { username } = user;
      let normalizedUsername = username.replace(/[^0-9a-zA-Z]/g, '');

      let sandboxBundleId = await UserSettings.getAsync('sandboxBundleId', null);
      if (!sandboxBundleId) {
        sandboxBundleId = UrlUtils.randomIdentifier(5);
        await UserSettings.mergeAsync({ sandboxBundleId });
      }

      options.type = 'client';
      options.releaseChannel = 'default';
      options.hardcodeRevisionId = 'eb310d00-2af3-11e8-9906-3ba982c41215';

      let projectDir = path.join(UserSettings.dotExpoHomeDirectory(), 'expo-home');
      rimraf.sync(projectDir);
      mkdirp.sync(projectDir);

      let modifiedAppJSON = HOME_APP_JSON;
      modifiedAppJSON.expo.ios.bundleIdentifier = `host.exp.${normalizedUsername}-${sandboxBundleId}`;
      modifiedAppJSON.expo.ios.config.actualBundleIdentifier =
        modifiedAppJSON.expo.ios.bundleIdentifier;
      fs.writeFileSync(path.join(projectDir, 'app.json'), JSON.stringify(modifiedAppJSON));
      fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify(HOME_PKG_JSON));

      const iosBuilder = new IOSBuilder(projectDir, options);
      return iosBuilder.command();
    });
};
