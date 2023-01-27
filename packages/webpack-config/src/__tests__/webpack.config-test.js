import { dirname } from 'path';

import createConfig from '..';
import normalizePaths from '../utils/normalizePaths';

jest.unmock('resolve-from');

const projectRoot = dirname(require.resolve('@expo/webpack-config/e2e/basic'));

function normalizeConfig(config) {
  // Replace plugins with their names
  // in the future we may want to selectively test certain plugin shapes
  const plugins = config.plugins;
  config.plugins = [];
  // Just use plugin names in order
  for (const plugin of plugins) {
    config.plugins.push(plugin.constructor.name);
  }

  // Make the paths be relative to the project
  const normalized = normalizePaths(config, value => value.split('cli/').pop());

  // Strip out any path issues that come from testing in a monorepo.
  function normalizeLoaders(loaders) {
    return loaders.map(rule => {
      if (rule.use) {
        rule.use = normalizePaths(rule.use, value => {
          if (value.includes('node_modules')) {
            return `node_modules` + value.split('node_modules').pop();
          }
          return value;
        });
      } else if (rule.oneOf) {
        rule.oneOf = normalizeLoaders(rule.oneOf);
      }
      return rule;
    });
  }

  normalized.module.rules = normalizeLoaders(normalized.module.rules);
  expect(normalized.entry).toEqual([
    expect.stringContaining('node_modules/resize-observer-polyfill/dist/ResizeObserver.global.js'),
    expect.stringContaining('basic/index.js'),
  ]);
  delete normalized.entry;

  delete normalized.devServer?.watchOptions;
  delete normalized.devServer?.static?.watch.ignored;

  // performance is disabled in CI
  delete normalized.performance;
  delete normalized.cache.version;
  return normalized;
}

let originalCiValue;
let original_EXPO_DEBUG;

beforeAll(() => {
  original_EXPO_DEBUG = process.env.EXPO_DEBUG;
  originalCiValue = process.env.CI;
  process.env.CI = 'true';
  process.env.EXPO_DEBUG = 'true';
});

afterAll(() => {
  process.env.EXPO_DEBUG = original_EXPO_DEBUG;
  process.env.CI = originalCiValue;
});

describe(`web`, () => {
  it('web development', async () => {
    const config = await createConfig({ mode: 'development', platform: 'web', projectRoot });
    const normalized = normalizeConfig(config);

    expect(normalized).toMatchSnapshot();
  });

  it('web production', async () => {
    const config = await createConfig({ mode: 'production', platform: 'web', projectRoot });

    const normalized = normalizeConfig(config);

    expect(normalized).toMatchSnapshot();
  });
});
