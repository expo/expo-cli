import { ExpoConfig } from '@expo/config';
import { getPossibleProjectRoot } from '@expo/config/paths';
import BrotliPlugin from 'brotli-webpack-plugin';
import CompressionPlugin from 'compression-webpack-plugin';

import { getConfig } from '../env';
import { AnyConfiguration, Environment } from '../types';
import { enableWithPropertyOrConfig, overrideWithPropertyOrConfig } from '../utils';

/**
 * @internal
 */
export const DEFAULT_GZIP_OPTIONS = {
  test: /\.(js|css)$/,
  filename: '[path].gz[query]',
  algorithm: 'gzip',
  threshold: 1024,
  minRatio: 0.8,
};

/**
 * @internal
 */
export const DEFAULT_BROTLI_OPTIONS = {
  asset: '[path].br[query]',
  test: /\.(js|css)$/,
  threshold: 1024,
  minRatio: 0.8,
};

/**
 * Add production compression options to the provided Webpack config.
 *
 * @param webpackConfig Existing Webpack config to modify.
 * @param env Environment used for getting the Expo project config.
 * @category addons
 */
export default function withCompression(
  webpackConfig: AnyConfiguration,
  env: Pick<Environment, 'projectRoot' | 'mode' | 'config' | 'locations'>
): AnyConfiguration {
  if (webpackConfig.mode !== 'production') {
    return webpackConfig;
  }

  env.projectRoot = env.projectRoot || getPossibleProjectRoot();

  const config = getConfig(env);
  return addCompressionPlugins(webpackConfig, config);
}

/**
 * Add Gzip and Brotli compression plugins to the provided Webpack config.
 *
 * @param webpackConfig Existing Webpack config to modify.
 * @param expoConfig Expo config with compression options.
 * @internal
 */
export function addCompressionPlugins(
  webpackConfig: AnyConfiguration,
  expoConfig: ExpoConfig
): AnyConfiguration {
  const gzipConfig = overrideWithPropertyOrConfig(
    expoConfig.web?.build?.gzip,
    DEFAULT_GZIP_OPTIONS,
    true
  );
  const brotliConfig = enableWithPropertyOrConfig(
    expoConfig.web?.build?.brotli,
    DEFAULT_BROTLI_OPTIONS,
    true
  );

  if (!Array.isArray(webpackConfig.plugins)) webpackConfig.plugins = [];

  if (gzipConfig) webpackConfig.plugins.push(new CompressionPlugin(gzipConfig));
  if (brotliConfig) webpackConfig.plugins.push(new BrotliPlugin(brotliConfig));

  return webpackConfig;
}
