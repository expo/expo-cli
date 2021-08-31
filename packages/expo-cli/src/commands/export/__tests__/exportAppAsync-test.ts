import { vol } from 'memfs';

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
            },
          }),
          {}
        )
      ),
    prepareHooks: jest.fn(() => []),
    runHook: jest.fn(async () => {}),
  },
  UserManager: {
    getCurrentUsernameAsync() {
      return 'bacon';
    },
  },

  printBundleSizes: jest.fn(),

  EmbeddedAssets: {
    configureAsync: jest.fn(),
  },
  Env: {
    shouldUseDevServer() {
      return true;
    },
  },
  ProjectAssets: {
    exportAssetsAsync: jest.fn(() =>
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
      })
    ),
  },
}));

describe(exportAppAsync, () => {
  afterAll(() => {
    vol.reset();
  });

  it(`exports an app`, async () => {
    vol.fromJSON(
      {
        'package.json': JSON.stringify({ dependencies: { expo: '34.0.0' } }),
      },
      '/'
    );
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
    const { Project, EmbeddedAssets } = require('xdl');

    expect(EmbeddedAssets.configureAsync).toBeCalled();
    expect(Project.prepareHooks).toBeCalled();

    expect(vol.toJSON()).toStrictEqual({
      '/dist/debug.html': expect.stringMatching(/<script/),
      '/dist/assetmap.json': expect.any(String),
      '/dist/assets': null,
      '/dist/bundles/ios-4fe3891dcaca43901bd8797db78405e4.js': expect.stringMatching(
        /sourceMappingURL/
      ),
      '/dist/bundles/ios-4fe3891dcaca43901bd8797db78405e4.map': 'ios_map',
      '/dist/ios-index.json': expect.stringContaining('"name":"my-app"'),
      '/package.json': expect.any(String),
    });
  });

  it(`exports an app with experimental bundling`, async () => {
    const outputDir = '/dist/';

    const { Project, EmbeddedAssets } = require('xdl');
    EmbeddedAssets.configureAsync = jest.fn();
    Project.prepareHooks = jest.fn();
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

    expect(EmbeddedAssets.configureAsync).not.toBeCalled();
    expect(Project.prepareHooks).not.toBeCalled();

    expect(vol.toJSON()).toStrictEqual({
      '/dist/debug.html': expect.stringMatching(/<script/),
      '/dist/assetmap.json': expect.any(String),
      '/dist/assets': null,
      '/dist/bundles/ios-4fe3891dcaca43901bd8797db78405e4.js': expect.stringMatching(
        /sourceMappingURL/
      ),
      '/dist/metadata.json': expect.stringContaining('"fileMetadata"'),
      '/dist/bundles/ios-4fe3891dcaca43901bd8797db78405e4.map': 'ios_map',
      '/dist/ios-index.json': expect.stringContaining('"name":"my-app"'),
      '/package.json': expect.any(String),
    });
  });
});
