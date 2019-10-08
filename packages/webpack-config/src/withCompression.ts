import { Configuration } from 'webpack';

// @ts-ignore
import CompressionPlugin from 'compression-webpack-plugin';
// @ts-ignore
import BrotliPlugin from 'brotli-webpack-plugin';
import { DevConfiguration, Environment } from './types';
import { enableWithPropertyOrConfig, overrideWithPropertyOrConfig } from './utils/config';
import getConfig from './utils/getConfig';
import getMode from './utils/getMode';

const DEFAULT_GZIP = {
  test: /\.(js|css)$/,
  filename: '[path].gz[query]',
  algorithm: 'gzip',
  threshold: 1024,
  minRatio: 0.8,
};

const DEFAULT_BROTLI = {
  asset: '[path].br[query]',
  test: /\.(js|css)$/,
  threshold: 1024,
  minRatio: 0.8,
};

export default function withCompression(
  webpackConfig: Configuration | DevConfiguration,
  env: Environment
): Configuration | DevConfiguration {
  const mode = getMode(env);

  if (mode !== 'production') {
    return webpackConfig;
  }

  const config = getConfig(env);
  const { build: buildConfig = {} } = config.web;
  const gzipConfig = overrideWithPropertyOrConfig(buildConfig.gzip, DEFAULT_GZIP);
  const brotliConfig = enableWithPropertyOrConfig(buildConfig.brotli, DEFAULT_BROTLI);

  if (!Array.isArray(webpackConfig.plugins)) webpackConfig.plugins = [];

  if (gzipConfig) webpackConfig.plugins.push(new CompressionPlugin(gzipConfig));
  if (brotliConfig) webpackConfig.plugins.push(new BrotliPlugin(brotliConfig));

  return webpackConfig;
}
