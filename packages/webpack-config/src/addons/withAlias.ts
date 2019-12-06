import { AnyConfiguration } from '../types';
import { aliases } from '../env';

export default function withAlias(
  webpackConfig: AnyConfiguration,
  alias: { [key: string]: string } = {}
): AnyConfiguration {
  // Mix in aliases
  if (!webpackConfig.resolve) webpackConfig.resolve = {};
  webpackConfig.resolve.alias = {
    ...aliases,
    ...(webpackConfig.resolve.alias || {}),
    ...alias,
  };

  return webpackConfig;
}
