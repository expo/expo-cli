import fs from 'fs-extra';
import { vol } from 'memfs';
import path from 'path';

import UserSettings from '../../UserSettings';
import { ExpoUpdatesManifestHandler } from '../../internal';
import { getManifestResponseAsync } from '../ManifestHandler';

const actualFs = jest.requireActual('fs') as typeof fs;
jest.mock('fs');

describe('ExpoUpdatesManifestHandler', () => {
  describe(getManifestResponseAsync, () => {
    beforeAll(() => {
      fs.removeSync(UserSettings.userSettingsFile());
    });

    beforeEach(() => {
      const packageJson = JSON.stringify(
        {
          name: 'testing123',
          version: '0.1.0',
          main: 'index.js',
        },
        null,
        2
      );

      const appJson = JSON.stringify(
        {
          expo: {
            name: 'testing 123',
            icon: './icon.png',
            splash: { image: './assets/splash.png' },
            version: '0.1.0',
            runtimeVersion: { policy: 'sdkVersion' },
            sdkVersion: '38.0.0',
            slug: 'testing-123',
            extras: { myExtra: '123' },
          },
        },
        null,
        2
      );

      vol.fromJSON({
        '/alpha/package.json': packageJson,
        '/alpha/app.json': appJson,
        '/alpha/index.js': 'console.log("lol")',
      });

      const iconPath = path.resolve(__dirname, './fixtures/icon.png');
      const icon = actualFs.readFileSync(iconPath);
      vol.mkdirpSync('/alpha/assets');
      vol.writeFileSync('/alpha/icon.png', icon);
      vol.writeFileSync('/alpha/assets/splash.png', icon);
    });

    afterEach(() => {
      vol.reset();
    });

    it(`returns a minimal expected manifest`, async () => {
      const res = await ExpoUpdatesManifestHandler.getManifestResponseAsync({
        projectRoot: '/alpha',
        host: '127.0.0.1:19000',
        platform: 'ios',
      });

      expect(res.headers).toEqual(
        new Map(
          Object.entries({
            'expo-protocol-version': 0,
            'expo-sfv-version': 0,
            'cache-control': 'private, max-age=0',
            'content-type': 'application/json',
          })
        )
      );

      expect(res.body).toMatchObject({
        id: expect.any(String),
        createdAt: expect.any(String),
        runtimeVersion: 'exposdk:38.0.0',
        launchAsset: {
          key: 'index',
          contentType: 'application/javascript',
          url: 'http://127.0.0.1:80/index.bundle?platform=ios&dev=true&hot=false&minify=false',
        },
        assets: [
          {
            contentType: 'image/png',
            hash: 'bc8dff68bbfd008f5c5cd9f33711cb31d4ffc207d31e7da9b944f9d79a07e4ef',
            key: './icon.png',
            url: 'http://127.0.0.1:80/assets/./icon.png',
          },
          {
            contentType: 'image/png',
            hash: 'bc8dff68bbfd008f5c5cd9f33711cb31d4ffc207d31e7da9b944f9d79a07e4ef',
            key: './assets/splash.png',
            url: 'http://127.0.0.1:80/assets/./assets/splash.png',
          },
        ],
        metadata: {},
        extra: {
          eas: {},
          expoClient: {
            name: 'testing 123',
            description: undefined,
            version: '0.1.0',
            sdkVersion: '38.0.0',
            slug: 'testing-123',
            platforms: [],
            extras: { myExtra: '123' },
            icon: './icon.png',
            iconAsset: { assetKey: './icon.png', rawUrl: null },
            hostUri: '127.0.0.1:80',
            splash: {
              image: './assets/splash.png',
              imageAsset: {
                assetKey: './assets/splash.png',
                rawUrl: null,
              },
            },
            _internal: {
              isDebug: expect.any(Boolean),
              projectRoot: '/alpha',
              dynamicConfigPath: null,
              staticConfigPath: '/alpha/app.json',
              packageJsonPath: '/alpha/package.json',
            },
          },
          expoGo: {
            developer: { tool: 'expo-cli', projectRoot: '/alpha' },
            packagerOpts: {
              scheme: null,
              hostType: 'lan',
              lanType: 'ip',
              devClient: false,
              dev: true,
              minify: false,
              urlRandomness: null,
              https: false,
            },
            mainModuleName: 'index',
            debuggerHost: '127.0.0.1:80',
            logUrl: 'http://127.0.0.1:80/logs',
          },
        },
      });
    });
  });
});
