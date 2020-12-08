import { withPlugins } from '@expo/config-plugins';

import { ConfigPlugin } from '../Config.types';
import { serializeAfterStaticPlugins } from '../Serialize';

/**
 * Resolves static plugins array as config plugin functions.
 *
 * @param config
 * @param projectRoot
 */
export const withConfigPlugins: ConfigPlugin = config => {
  // @ts-ignore: plugins not on config type yet -- TODO
  if (!Array.isArray(config.plugins) || !config.plugins?.length) {
    return config;
  }
  // Resolve and evaluate plugins
  // @ts-ignore: TODO: add plugins to the config schema
  config = withPlugins(config, config.plugins);
  // plugins aren't serialized by default, serialize the plugins after resolving them.
  return serializeAfterStaticPlugins(config);
};
