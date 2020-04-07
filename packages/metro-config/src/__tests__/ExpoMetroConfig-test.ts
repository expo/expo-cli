import path from 'path';

import { getDefaultConfig, loadAsync } from '../ExpoMetroConfig';

const projectRoot = path.join(__dirname, '__fixtures__', 'hello-world');

describe('getDefaultConfig', () => {
  const propertyMatchers = {
    transformer: {
      assetPlugins: expect.arrayContaining([expect.stringContaining('hashAssetFiles')]),
      assetRegistryPath: expect.stringContaining('AssetRegistry'),
      babelTransformerPath: expect.stringContaining('transformer.js'),
    },
  };

  it('loads default configuration', () => {
    expect(getDefaultConfig(projectRoot)).toMatchSnapshot(propertyMatchers);
  });

  it('loads default configuration for bare apps', () => {
    expect(getDefaultConfig(projectRoot, { target: 'bare' })).toMatchSnapshot(propertyMatchers);
  });

  it('complains about an invalid target setting', () => {
    process.env.EXPO_TARGET = 'bare';
    expect(() =>
      // @ts-ignore incorrect `target` value passed on purpose
      getDefaultConfig(projectRoot, { target: 'blooper' })
    ).toThrowErrorMatchingSnapshot();
  });
});

describe('loadAsync', () => {
  it('adds runtime options to the default configuration', async () => {
    const options = {
      maxWorkers: 10,
      resetCache: true,
      reporter: { update() {} },
      sourceExts: ['yml', 'toml', 'json'],
    };
    const config = await loadAsync(projectRoot, options);
    expect(config).toMatchObject({
      maxWorkers: options.maxWorkers,
      resetCache: options.resetCache,
      reporter: options.reporter,
      resolver: {
        sourceExts: options.sourceExts,
      },
    });
  });
});
