import { Configuration } from 'webpack';

/**
 * Apply aliases to a Webpack config
 *
 * @param webpackConfig Existing Webpack config to modify.
 * @param alias Extra aliases to inject
 * @category addons
 */
export default function withAlias(
  webpackConfig: Configuration,
  alias: { [key: string]: string } = {}
): Configuration {
  // Mix in aliases
  if (!webpackConfig.resolve) webpackConfig.resolve = {};
  webpackConfig.resolve.alias = {
    ...(webpackConfig.resolve.alias || {}),
    ...alias,
  };

  return webpackConfig;
}
