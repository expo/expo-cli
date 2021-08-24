import { getConfig } from '@expo/config';
import fs from 'fs-extra';
import klawSync from 'klaw-sync';
import os from 'os';
import path from 'path';
import prettyBytes from 'pretty-bytes';
import util from 'util';

import JsonFile from '../../../json-file/build/JsonFile';
import { createFromFixtureAsync, runAsync } from '../TestUtils';

// Set this to true to enable caching and prevent rerunning yarn installs
const testingLocally = false;

async function setupTestProjectAsync(name: string, fixtureName: string): Promise<string> {
  // If you're testing this locally, you can set the projectRoot to a local project (you created with expo init) to save time.
  const projectRoot = await createFromFixtureAsync(os.tmpdir(), {
    dirName: name,
    reuseExisting: testingLocally,
    fixtureName,
  });

  // Many of the factors in this test are based on the expected SDK version that we're testing against.
  const { exp } = getConfig(projectRoot, { skipPlugins: true });
  expect(exp.sdkVersion).toBe('42.0.0');
  return projectRoot;
}

beforeAll(() => {
  jest.setTimeout(5 * 60_000);
});

const MAIN_FILE_NAME_MAP = {
  ios: 'index.jsbundle',
  android: 'index.android.bundle',
};

type Range = { min: number; max: number };

async function testBundleResultsAsync({
  projectRoot,
  testName,
  includedModuleSize,
  mainBundleSize,
  platform,
  expectedFilePaths,
}: {
  projectRoot: string;
  testName: string;
  includedModuleSize: Range;
  mainBundleSize: Range;
  platform: string;
  expectedFilePaths: string[];
}) {
  const mainFileName = MAIN_FILE_NAME_MAP[platform];
  const expectedOutput = path.join(projectRoot, `${platform}-build`);
  const sourceMapOutput = path.join(expectedOutput, `${mainFileName}.map`);

  // List output files with sizes for snapshotting.
  // This is to make sure that any changes to the output are intentional.
  // Posix path formatting is used to make paths the same across OSes.
  const files = klawSync(expectedOutput)
    .map(entry => {
      if (!entry.stats.isFile()) {
        return null;
      }
      return {
        filepath: path.posix.relative(projectRoot, entry.path),
        size: entry.stats.size,
        sizeHuman: prettyBytes(entry.stats.size),
      };
    })
    .filter(Boolean);

  // If this changes then everything else probably changed as well
  expect(files.map(({ filepath }) => filepath)).toStrictEqual(expectedFilePaths);

  // eslint-disable-next-line no-console
  console.info(`Results (${testName}):\n`, util.inspect(files, { colors: true }));

  const bundle = fs.readFileSync(path.join(expectedOutput, mainFileName), 'utf8');
  const bundleLines = bundle.split('\n');

  // Should match the banner item:
  expect(bundleLines[0]).toBe(
    `var __BUNDLE_START_TIME__=this.nativePerformanceNow?nativePerformanceNow():Date.now(),__DEV__=false,process=this.process||{};process.env=process.env||{};process.env.NODE_ENV=process.env.NODE_ENV||"production";`
  );

  // Main module imported last
  expect(bundleLines[bundleLines.length - 1]).toMatch(/__r\(0\);/);

  // source maps
  const parsedMap = (await JsonFile.readAsync(sourceMapOutput)) as {
    sources?: string[];
  };
  const mainFileInfo = files.find(item => item.filepath === `${platform}-build/${mainFileName}`);

  // eslint-disable-next-line no-console
  console.info(`Module count (${testName}):\n`, parsedMap.sources.length);
  // eslint-disable-next-line no-console
  console.info(`Bundle size (${testName}):\n`, mainFileInfo.size);

  // Banner file (adds __BUNDLE_START_TIME__ ...)
  expect(parsedMap.sources[0]).toBe('__prelude__');
  // Number of files that are included in the basic bundle (produced by metro->babel->uglify)
  // This will change if things get better/worse bundling-wise.
  expect(parsedMap.sources.length).toBeGreaterThanOrEqual(includedModuleSize.min);
  expect(parsedMap.sources.length).toBeLessThanOrEqual(includedModuleSize.max);

  // Ensure that the project source maps don't include the entire computer directory
  expect(parsedMap.sources).toContain('node_modules/react/index.js');

  expect(parsedMap).toStrictEqual({
    // static test of source map version, this may change when updating react-native.
    version: 3,
    // standard source map properties
    sources: expect.any(Array),
    sourcesContent: expect.any(Array),
    names: expect.any(Array),
    mappings: expect.any(String),
    // ??
    x_facebook_sources: expect.any(Array),
  });

  // This is the overall file size of the main bundle in bytes.
  // Raise if the size changes so we are aware of the net increase
  expect(mainFileInfo.size).toBeGreaterThanOrEqual(mainBundleSize.min);
  expect(mainFileInfo.size).toBeLessThanOrEqual(mainBundleSize.max);

  return { files, bundle, map: parsedMap };
}

async function runBundleCmdAsync(projectRoot: string, args: string[]) {
  const dotExpoHomeDirectory = path.join(projectRoot, '../.expo');
  return await runAsync(
    [
      'bundle',
      // Comment this out locally for faster results
      !testingLocally && '--clear',
      ...args,
    ].filter(Boolean) as string[],
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        // Isolate the test from global state such as the currently signed in user.
        __UNSAFE_EXPO_HOME_DIRECTORY: dotExpoHomeDirectory,
      },
    }
  );
}

describe('basic', () => {
  it('bundles for ios', async () => {
    const projectRoot = await setupTestProjectAsync('ios-bundle', 'with-blank');
    await runBundleCmdAsync(projectRoot, ['--platform', 'ios']);

    await testBundleResultsAsync({
      projectRoot,
      testName: 'ios-bundle',
      platform: 'ios',
      includedModuleSize: {
        min: 475,
        max: 500,
      },
      mainBundleSize: {
        // 800kb
        min: 800000,
        // 833kb
        max: 833000,
      },
      expectedFilePaths: ['ios-build/index.jsbundle', 'ios-build/index.jsbundle.map'],
    });
  });

  it('bundles for android', async () => {
    const projectRoot = await setupTestProjectAsync('android-bundle', 'with-blank');
    await runBundleCmdAsync(projectRoot, ['--platform', 'android']);

    await testBundleResultsAsync({
      projectRoot,
      testName: 'android-bundle',
      platform: 'android',
      includedModuleSize: {
        min: 474,
        max: 480,
      },
      mainBundleSize: {
        // 800kb
        min: 800000,
        // 838kb
        max: 838404,
      },
      expectedFilePaths: [
        'android-build/index.android.bundle',
        'android-build/index.android.bundle.map',
      ],
    });
  });
});

describe('with assets', () => {
  it('bundles for ios', async () => {
    const projectRoot = await setupTestProjectAsync('ios-bundle-assets', 'with-assets');
    await runBundleCmdAsync(projectRoot, ['--platform', 'ios']);

    await testBundleResultsAsync({
      projectRoot,
      testName: 'ios-bundle-assets',
      platform: 'ios',
      includedModuleSize: {
        min: 477,
        max: 480,
      },
      mainBundleSize: {
        // 800kb
        min: 800000,
        // 833kb
        max: 833000,
      },
      expectedFilePaths: [
        'ios-build/assets/icon.png',
        'ios-build/assets/icon@2x.png',
        'ios-build/assets/icon@3x.png',
        'ios-build/index.jsbundle',
        'ios-build/index.jsbundle.map',
      ],
    });
  });

  it('bundles for android', async () => {
    const projectRoot = await setupTestProjectAsync('android-bundle-assets', 'with-assets');
    await runBundleCmdAsync(projectRoot, ['--platform', 'android']);

    await testBundleResultsAsync({
      projectRoot,
      testName: 'android-bundle-assets',
      platform: 'android',
      includedModuleSize: {
        min: 475,
        max: 480,
      },
      mainBundleSize: {
        // 800kb
        min: 800000,
        // 838kb
        max: 838404,
      },
      expectedFilePaths: [
        'android-build/drawable-hdpi/icon.png',
        'android-build/drawable-ldpi/icon.png',
        'android-build/drawable-mdpi/icon.png',
        'android-build/drawable-xhdpi/icon.png',
        'android-build/drawable-xxhdpi/icon.png',
        'android-build/drawable-xxxhdpi/icon.png',
        'android-build/index.android.bundle',
        'android-build/index.android.bundle.map',
      ],
    });
  });
});

describe('with tree-shaking', () => {
  it('bundles for ios', async () => {
    const projectRoot = await setupTestProjectAsync('ios-bundle-tree-shaking', 'with-blank');
    await runBundleCmdAsync(projectRoot, ['--platform', 'ios', '--entry-file', './TreeShaking.js']);

    const { bundle, map } = await testBundleResultsAsync({
      projectRoot,
      testName: 'ios-bundle-tree-shaking',
      platform: 'ios',
      includedModuleSize: {
        min: 406,
        max: 480,
      },
      mainBundleSize: {
        // 747 kB
        min: 747493,
        // 833kb
        max: 833000,
      },
      expectedFilePaths: ['ios-build/index.jsbundle', 'ios-build/index.jsbundle.map'],
    });

    // Currently we don't strip console logs in production
    expect(bundle).toMatch(/console\.log\('CONSOLE_LOG_IN_THE_PROJECT'\)/);
    // Test that different entry points works
    expect(map.sources).toContain('TreeShaking.js');
    expect(map.sources).not.toContain('App.js');
  });

  it('bundles for android', async () => {
    const projectRoot = await setupTestProjectAsync('android-bundle-tree-shaking', 'with-blank');
    await runBundleCmdAsync(projectRoot, [
      '--platform',
      'android',
      '--entry-file',
      './TreeShaking.js',
    ]);

    const { bundle, map } = await testBundleResultsAsync({
      projectRoot,
      testName: 'android-bundle-tree-shaking',
      platform: 'android',
      includedModuleSize: {
        min: 404,
        max: 480,
      },
      mainBundleSize: {
        // 753 kB
        min: 753354,
        // 838kb
        max: 838404,
      },
      expectedFilePaths: [
        'android-build/index.android.bundle',
        'android-build/index.android.bundle.map',
      ],
    });

    // Currently we don't strip console logs in production
    expect(bundle).toMatch(/console\.log\('CONSOLE_LOG_IN_THE_PROJECT'\)/);
    // Test that different entry points works
    expect(map.sources).toContain('TreeShaking.js');
    expect(map.sources).not.toContain('App.js');
  });
});
