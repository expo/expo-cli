import { AnyConfiguration } from './types';
import { DEFAULT_ALIAS } from './utils/config';

export default function withAlias(
  webpackConfig: AnyConfiguration,
  alias: { [key: string]: string } = {}
): AnyConfiguration {
  // Mix in aliases
  if (!webpackConfig.resolve) webpackConfig.resolve = {};
  webpackConfig.resolve.alias = {
    ...DEFAULT_ALIAS,
    ...(webpackConfig.resolve.alias || {}),
    ...alias,
  };

  return webpackConfig;
}
