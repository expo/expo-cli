import { ExpoConfig } from '@expo/config';
import axios from 'axios';
import fs from 'fs-extra';
import { vol } from 'memfs';
import os from 'os';
import path from 'path';
import uuid from 'uuid';

import {
  getManifestResponseAsync,
  getSignedManifestStringAsync,
  getUnsignedManifestString,
} from '../ManifestHandler';

const actualFs = jest.requireActual('fs') as typeof fs;
jest.mock('fs');
jest.mock('axios');

jest.mock('../../User', () => {
  // const user = jest.requireActual('../../User');
  return {
    // ...user,
    ANONYMOUS_USERNAME: 'anonymous',
    getSessionAsync() {
      return null;
    },
    ensureLoggedInAsync: () => ({
      sessionSecret: 'SECRET',
    }),
  };
});
jest.mock('../../project/ExpSchema', () => {
  // const user = jest.requireActual('../../User');
  return {
    getAssetSchemasAsync() {
      return ['icon', 'splash.image'];
    },
  };
});

const mockManifest: ExpoConfig = {
  name: 'Hello',
  slug: 'hello-world',
  owner: 'ownername',
  version: '1.0.0',
  platforms: ['ios'],
};

const mockSignedManifestResponse = JSON.stringify({
  manifestString: JSON.stringify(mockManifest),
  signature: 'SIGNATURE_HERE',
  version: '1.0.0',
});

describe('getSignedManifestStringAsync', () => {
  it('calls the server API to sign a manifest', async () => {
    const requestFunction = axios.request as jest.MockedFunction<typeof axios.request>;
    requestFunction.mockReturnValueOnce(
      Promise.resolve({
        status: 200,
        data: { data: { response: mockSignedManifestResponse } },
      })
    );
    const manifestString = await getSignedManifestStringAsync(mockManifest, {
      sessionSecret: 'SECRET',
    });
    expect(manifestString).toBe(mockSignedManifestResponse);
    expect(requestFunction.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "args": Object {
            "remotePackageName": "hello-world",
            "remoteUsername": "ownername",
          },
          "manifest": Object {
            "name": "Hello",
            "owner": "ownername",
            "platforms": Array [
              "ios",
            ],
            "slug": "hello-world",
            "version": "1.0.0",
          },
        },
        "headers": Object {
          "Expo-Session": "SECRET",
          "Exponent-Client": "xdl",
        },
        "maxBodyLength": 104857600,
        "maxContentLength": 104857600,
        "method": "post",
        "url": "https://exp.host/--/api/v2/manifest/sign",
      }
    `);
  });
});

describe('getUnsignedManifestString', () => {
  it('returns a stringified manifest with the same shape a server-signed manifest', () => {
    expect(getUnsignedManifestString(mockManifest)).toMatchSnapshot();
  });
});

describe('getManifestResponseAsync', () => {
  // for some reason, tempy fails with memfs in XDL
  const expoDir = path.join(os.tmpdir(), `.expo-${uuid.v4()}`);

  beforeAll(() => {
    process.env.__UNSAFE_EXPO_HOME_DIRECTORY = expoDir;
    fs.mkdirpSync(expoDir);
  });

  afterAll(() => {
    process.env.__UNSAFE_EXPO_HOME_DIRECTORY = '';
    fs.removeSync(expoDir);
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
    delete process.env.EXPO_SOME_TEST_VALUE;
    delete process.env.REACT_NATIVE_TEST_VALUE;
    delete process.env.EXPO_APPLE_PASSWORD;
  });

  it(`returns a minimal expected manifest`, async () => {
    process.env.EXPO_SOME_TEST_VALUE = 'true';
    process.env.REACT_NATIVE_TEST_VALUE = 'true';
    process.env.EXPO_APPLE_PASSWORD = 'my-password';

    const res = await getManifestResponseAsync({
      projectRoot: '/alpha',
      host: '127.0.0.1:19000',
      platform: 'ios',
      acceptSignature: 'true',
    });

    // console.log(res.exp);

    // Values starting with EXPO_ or REACT_NATIVE_ get added to the env and exposed to expo-constants
    expect(res.exp.env.EXPO_SOME_TEST_VALUE).toBe('true');
    expect(res.exp.env.REACT_NATIVE_TEST_VALUE).toBe('true');
    // This value is blacklisted
    expect(res.exp.env.EXPO_APPLE_PASSWORD).not.toBeDefined();
    // Users should use app.config.js + extras now so test that it always works
    expect(res.exp.extras.myExtra).toBe('123');

    // Ensure the bundle URL is built correctly
    expect(res.exp.bundleUrl).toBe(
      'http://127.0.0.1:80/index.bundle?platform=ios&dev=true&hot=false&minify=false'
    );
    expect(res.exp.debuggerHost).toBe('127.0.0.1:80');
    expect(res.exp.logUrl).toBe('http://127.0.0.1:80/logs');
    expect(res.exp.hostUri).toBe('127.0.0.1:80');

    expect(res.exp.mainModuleName).toBe('index');
    expect(res.exp.packagerOpts).toBeDefined();
    // Required for various tools
    expect(res.exp.developer.projectRoot).toBe('/alpha');

    // ProjectAssets gathered URLs
    expect(res.exp.iconUrl).toBe('http://127.0.0.1:80/assets/./icon.png');
    expect(res.exp.splash.imageUrl).toBe('http://127.0.0.1:80/assets/./assets/splash.png');
  });
});
