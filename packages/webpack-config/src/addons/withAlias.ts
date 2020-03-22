import { AnyConfiguration } from '../types';

/**
 * Inject the required aliases for using React Native web and the extended Expo web ecosystem. Optionally can also safely append aliases to a Webpack config.
 *
 * @param webpackConfig Existing Webpack config to modify.
 * @param alias Extra aliases to inject
 * @category addons
 */
export default function withAlias(
  webpackConfig: AnyConfiguration,
  alias: { [key: string]: string } = {}
): AnyConfiguration {
  // Mix in aliases
  if (!webpackConfig.resolve) webpackConfig.resolve = {};
  webpackConfig.resolve.alias = {
    ...(webpackConfig.resolve.alias || {}),
    ...alias,
  };

  return webpackConfig;
}
