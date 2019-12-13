/* eslint-env node */

import path from 'path';

import withCompression, { addCompressionPlugins } from '../withCompression';

const projectRoot = path.resolve(__dirname, '../../../tests/basic');

it(`only uses compression in production`, () => {
  expect(
    withCompression(
      {
        mode: 'production',
      },
      { projectRoot }
    ).plugins.length
  ).toBe(1);

  expect(
    withCompression(
      {
        mode: 'development',
      },
      { projectRoot }
    ).plugins
  ).not.toBeDefined();
});

describe('addCompressionPlugins', () => {
  it(`can disable all compression`, () => {
    const shimWebpackConfig = {};

    const noPluginsWebpackConfig = addCompressionPlugins(shimWebpackConfig, {
      web: { build: { gzip: false, brotli: false } },
    });
    expect(noPluginsWebpackConfig.plugins.length).toBe(0);
  });

  it(`can enable brotli compression with custom options`, () => {
    const shimWebpackConfig = {};

    const customWebpackConfig = addCompressionPlugins(shimWebpackConfig, {
      web: { build: { gzip: false, brotli: { threshold: 6500000 } } },
    });

    expect(customWebpackConfig.plugins.length).toBe(1);
    expect(customWebpackConfig.plugins[0].threshold).toBe(6500000);
  });

  it(`can customize gzip with custom options`, () => {
    const shimWebpackConfig = {};

    const customWebpackConfig = addCompressionPlugins(shimWebpackConfig, {
      web: { build: { gzip: { cache: true, minRatio: -1000 }, brotli: false } },
    });

    expect(customWebpackConfig.plugins.length).toBe(1);
    expect(customWebpackConfig.plugins[0].options.minRatio).toBe(-1000);
    expect(customWebpackConfig.plugins[0].options.cache).toBe(true);
  });
});
