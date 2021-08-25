import { vol } from 'memfs';
import path from 'path';

import {
  createMultiPlatformBundleInfo,
  writeAssetMapAsync,
  writeBundlesAsync,
  writeDebugHtmlAsync,
  writePlatformManifestsAsync,
  writeSourceMapsAsync,
} from '../writeContents';

jest.mock('fs');
jest.mock('resolve-from');

describe(writeDebugHtmlAsync, () => {
  afterAll(() => {
    vol.reset();
  });
  it(`creates a debug html file`, async () => {
    const projectRoot = '/test/';
    await writeDebugHtmlAsync({
      outputDir: projectRoot,
      fileNames: { ios: 'index.ios.js', android: 'index.android.js', windows: 'index.windows.js' },
    });
    expect(vol.readFileSync(path.join(projectRoot, 'debug.html'), 'utf8')).toMatchSnapshot();
  });
});

describe(writeBundlesAsync, () => {
  afterAll(() => {
    vol.reset();
  });
  it(`writes JS bundles to disk`, async () => {
    const projectRoot = '/test/';

    const contents = `var foo = true;`;
    const results = await writeBundlesAsync({
      outputDir: projectRoot,
      bundles: {
        ios: {
          code: contents,
        },
        android: {
          code: contents,
        },
      },
    });

    expect(results.fileNames.android).toBeDefined();

    expect(results.fileNames.ios).toBe('ios-4fe3891dcaca43901bd8797db78405e4.js');
    expect(results.hashes).toStrictEqual({
      ios: expect.any(String),
      android: expect.any(String),
    });
    expect(vol.readFileSync(path.join(projectRoot, results.fileNames.ios), 'utf8')).toBe(contents);
  });
  it(`writes hbc bundles to disk`, async () => {
    const projectRoot = '/test/';
    const contents = Uint8Array.from([1, 2, 3]);
    const results = await writeBundlesAsync({
      outputDir: projectRoot,
      bundles: {
        ios: {
          // this overwrites js code if present
          hermesBytecodeBundle: contents,
          code: 'var foo = true;',
        },
      },
    });

    expect(results.fileNames.ios).toBe('ios-5289df737df57326fcdd22597afb1fac.js');
    expect(results.hashes).toStrictEqual({
      ios: expect.any(String),
    });
    expect(vol.readFileSync(path.join(projectRoot, results.fileNames.ios))).toBeDefined();
  });
});

describe(writePlatformManifestsAsync, () => {
  afterAll(() => {
    vol.reset();
  });
  it(`writes platform manifests to disk`, async () => {
    const projectRoot = '/test/';

    const results = await writePlatformManifestsAsync({
      publicUrl: 'http://expo.io/',
      outputDir: projectRoot,
      fileNames: {
        ios: 'ios-foo.js',
        android: 'android-foo.js',
      },
      exp: {
        slug: '@bacon/app',
        name: 'app',
        sdkVersion: '43.0.0',
      },
      pkg: {
        dependencies: {
          'react-native': '64.0.0',
        },
      },
    });

    expect(results).toStrictEqual({
      ios: {
        bundleUrl: 'http://expo.io/bundles/ios-foo.js',
        dependencies: expect.any(Array),
        name: 'app',
        platform: 'ios',
        sdkVersion: '43.0.0',
        slug: '@bacon/app',
      },
      android: {
        bundleUrl: 'http://expo.io/bundles/android-foo.js',
        dependencies: expect.any(Array),
        name: 'app',
        platform: 'android',
        sdkVersion: '43.0.0',
        slug: '@bacon/app',
      },
    });
    expect(
      JSON.parse(vol.readFileSync(path.join(projectRoot, 'ios-index.json'), 'utf8') as string)
    ).toBeDefined();
    expect(
      JSON.parse(vol.readFileSync(path.join(projectRoot, 'android-index.json'), 'utf8') as string)
    ).toBeDefined();
  });
});

describe(createMultiPlatformBundleInfo, () => {
  it(`creates single platform info object for hooks`, async () => {
    const results = await createMultiPlatformBundleInfo({
      publicUrl: 'http://expo.io/',
      bundles: {
        ios: {
          code: 'var foo = true',
          map: '...',
        },
      },
      manifests: {
        ios: { slug: '@bacon/app' } as any,
      },
    });
    expect(results).toStrictEqual({
      iosBundle: 'var foo = true',
      iosManifest: { slug: '@bacon/app' },
      iosManifestUrl: 'http://expo.io/ios-index.json',
      iosSourceMap: '...',
    });
  });
  it(`creates multi-platform info object for hooks`, async () => {
    const results = await createMultiPlatformBundleInfo({
      publicUrl: 'http://expo.io/',
      bundles: {
        web: {
          code: 'var foo = true',
          map: 'web-source-map',
        },
        android: {
          code: 'let bar = false',
          map: 'android-source-map',
        },
      },
      manifests: {
        android: { slug: '@bacon/app' } as any,
      },
    });
    expect(results).toStrictEqual({
      androidBundle: 'let bar = false',
      androidManifest: { slug: '@bacon/app' },
      androidManifestUrl: 'http://expo.io/android-index.json',
      androidSourceMap: 'android-source-map',
      webBundle: 'var foo = true',
      webManifest: null,
      webManifestUrl: 'http://expo.io/web-index.json',
      webSourceMap: 'web-source-map',
    });
  });
});

describe(writeAssetMapAsync, () => {
  afterAll(() => {
    vol.reset();
  });
  it(`writes asset map to disk`, async () => {
    const projectRoot = '/test/';

    const results = await writeAssetMapAsync({
      outputDir: projectRoot,
      assets: [{ hash: 'alpha' }, { hash: 'beta' }],
    });

    expect(results).toStrictEqual({
      alpha: { hash: 'alpha' },
      beta: { hash: 'beta' },
    });

    expect(
      JSON.parse(vol.readFileSync(path.join(projectRoot, 'assetmap.json'), 'utf8') as string)
    ).toBeDefined();
  });
});

describe(writeSourceMapsAsync, () => {
  afterAll(() => {
    vol.reset();
  });

  it(`writes source maps to disk`, async () => {
    const projectRoot = '/test/';

    // User wrote this
    const contents = `var foo = true;\ninvalid-source-map-comment`;

    // Metro made this
    const bundles = {
      ios: {
        code: contents,
        map: 'ios_map',
      },
      android: {
        code: contents,
        map: 'android_map',
      },
    };

    // Expo persists the code and returns info
    const jsResults = await writeBundlesAsync({
      outputDir: projectRoot,
      bundles,
    });

    // Expo also modifies the source maps and persists
    const results = await writeSourceMapsAsync({
      outputDir: projectRoot,
      hashes: jsResults.hashes,
      fileNames: jsResults.fileNames,
      bundles,
      removeOriginalSourceMappingUrl: true,
    });

    for (const item of results) {
      expect(vol.readFileSync(path.join(projectRoot, item.fileName), 'utf8')).toBe(item.map);
      expect(
        vol.readFileSync(path.join(projectRoot, `${item.platform}-${item.hash}.js`), 'utf8')
      ).toMatch(/\/\/# sourceMappingURL=/);
      // Removed by `removeOriginalSourceMappingUrl`
      expect(
        vol.readFileSync(path.join(projectRoot, `${item.platform}-${item.hash}.js`), 'utf8')
      ).not.toMatch(/invalid-source-map-comment/);
    }
  });
});
