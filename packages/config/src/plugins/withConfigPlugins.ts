import { ConfigPlugin } from '../Config.types';
import { serializeAfterStaticPlugins } from '../Serialize';
import { StaticPlugin } from './modulePluginResolver';
import { withStaticPlugin } from './withStaticPlugin';

/**
 * Resolves a list of plugins.
 *
 * @param config
 * @param projectRoot
 */
const withPlugins: ConfigPlugin<(StaticPlugin | string)[]> = (config, plugins) => {
  return plugins.reduce((prev, plugin) => {
    return withStaticPlugin(prev, { plugin });
  }, config);
};

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
