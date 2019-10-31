import { Configuration } from 'webpack';

// @ts-ignore
import CompressionPlugin from 'compression-webpack-plugin';
// @ts-ignore
import BrotliPlugin from 'brotli-webpack-plugin';
import { ExpoConfig } from '@expo/config';
import { DevConfiguration, Environment } from './types';
import { enableWithPropertyOrConfig, overrideWithPropertyOrConfig } from './utils/config';
import getConfig from './utils/getConfig';

export const DEFAULT_GZIP_OPTIONS = {
  test: /\.(js|css)$/,
  filename: '[path].gz[query]',
  algorithm: 'gzip',
  threshold: 1024,
  minRatio: 0.8,
};

export const DEFAULT_BROTLI_OPTIONS = {
  asset: '[path].br[query]',
  test: /\.(js|css)$/,
  threshold: 1024,
  minRatio: 0.8,
};

export default function withCompression(
  webpackConfig: Configuration | DevConfiguration,
  env: Environment
): Configuration | DevConfiguration {
  if (webpackConfig.mode !== 'production') {
    return webpackConfig;
  }

  const config = getConfig(env);
  return addCompressionPlugins(webpackConfig, config);
}

export function addCompressionPlugins(
  webpackConfig: Configuration | DevConfiguration,
  config: ExpoConfig
): Configuration | DevConfiguration {
  const { build = {} } = config.web;
  const gzipConfig = overrideWithPropertyOrConfig(build.gzip, DEFAULT_GZIP_OPTIONS, true);
  const brotliConfig = enableWithPropertyOrConfig(build.brotli, DEFAULT_BROTLI_OPTIONS, true);

  if (!Array.isArray(webpackConfig.plugins)) webpackConfig.plugins = [];

  if (gzipConfig) webpackConfig.plugins.push(new CompressionPlugin(gzipConfig));
  if (brotliConfig) webpackConfig.plugins.push(new BrotliPlugin(brotliConfig));

  return webpackConfig;
}
