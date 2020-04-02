import path from 'path';

import fs from 'fs-extra';
import temporary from 'tempy';

import { getDefaultConfig, loadAsync } from '../ExpoMetroConfig';

const projectRoot = temporary.directory();

beforeAll(() => {
  fs.writeJSONSync(path.join(projectRoot, 'package.json'), {
    dependencies: {
      metro: '0.56.0',
      'react-native': '0.61.4',
    },
  });
  fs.outputFileSync(path.join(projectRoot, 'node_modules/react-native/index.js'), '');
  fs.outputFileSync(path.join(projectRoot, 'node_modules/expo/tools/hashAssetFiles'), '');
});

describe('getDefaultConfig', () => {
  it('loads default configuration', async () => {
    expect(await getDefaultConfig(projectRoot)).toMatchSnapshot({
      transformer: {
        assetPlugins: expect.arrayContaining([expect.stringContaining('hashAssetFiles')]),
        assetRegistryPath: expect.stringContaining('AssetRegistry'),
        babelTransformerPath: expect.stringContaining('transformer.js'),
      },
    });
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
