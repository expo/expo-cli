import { vol } from 'memfs';
import path from 'path';

import { exportAppAsync } from '../exportAppAsync';

jest.mock('fs');
jest.mock('resolve-from');

jest.mock('xdl', () => ({
  Project: {
    getPublishExpConfigAsync: () =>
      Promise.resolve({
        exp: {
          name: 'my-app',
          slug: 'my-app',
        },
        pkg: { dependencies: { expo: '43.0.0' } },
        hooks: {
          postExport: [],
        },
      }),
    createBundlesAsync: (projectRoot, options, { platforms }: { platforms: string[] }) =>
      Promise.resolve(
        platforms.reduce(
          (prev, platform) => ({
            ...prev,
            [platform]: {
              code: `var foo = true;`,
              map: `${platform}_map`,
            },
          }),
          {}
        )
      ),
    prepareHooks: () => Promise.resolve([]),
    runHook: () => Promise.resolve(),
  },
  UserManager: {
    getCurrentUsernameAsync() {
      return 'bacon';
    },
  },

  printBundleSizes() {},
  EmbeddedAssets: {
    configureAsync() {},
  },
  Env: {
    shouldUseDevServer() {
      return true;
    },
  },
  ProjectAssets: {
    exportAssetsAsync: () =>
      Promise.resolve({
        assets: [
          {
            hash: 'alpha',
            type: 'image',
            fileHashes: ['foobar', 'other'],
          },
          {
            hash: 'beta',
            type: 'font',
            fileHashes: ['betabar'],
          },
        ],
      }),
  },
}));

describe(exportAppAsync, () => {
  afterAll(() => {
    vol.reset();
  });

  it(`exports an app`, async () => {
    const outputDir = '/dist/';

    await exportAppAsync(
      '/',
      'http://expo.io/',
      'http://expo.io/assets',
      outputDir,
      {
        platforms: ['ios'],
        isDev: false,
        dumpAssetmap: true,
        dumpSourcemap: true,
        publishOptions: {},
      },
      false
    );

    expect(vol.toJSON()).toBe({});
  });
  xit(`exports an app with experimental bundling`, async () => {
    const outputDir = '/dist/';

    await exportAppAsync(
      '/',
      'http://expo.io/',
      'http://expo.io/assets',
      outputDir,
      {
        platforms: ['ios'],
        isDev: false,
        dumpAssetmap: true,
        dumpSourcemap: true,
        publishOptions: {},
      },
      true
    );

    expect(vol.toJSON()).toBe({});
  });
});
