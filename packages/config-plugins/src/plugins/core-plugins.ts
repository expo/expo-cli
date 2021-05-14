import assert from 'assert';

import { ConfigPlugin, StaticPlugin } from '../Plugin.types';
import { addHistoryItem, getHistoryItem, PluginHistoryItem } from '../utils/history';
import { withStaticPlugin } from './static-plugins';

/**
 * Resolves a list of plugins.
 *
 * @param config exported config
 * @param plugins list of config config plugins to apply to the exported config
 */
export const withPlugins: ConfigPlugin<(StaticPlugin | ConfigPlugin | string)[]> = (
  config,
  plugins
) => {
  assert(
    Array.isArray(plugins),
    'withPlugins expected a valid array of plugins or plugin module paths'
  );
  return plugins.reduce((prev, plugin) => {
    return withStaticPlugin(prev, { plugin });
  }, config);
};

/**
 * Prevents the same plugin from being run twice.
 * Used for migrating from unversioned expo config plugins to versioned plugins.
 *
 * @param config
 * @param name
 */
export const withRunOnce: ConfigPlugin<{
  plugin: ConfigPlugin<void>;
  name: PluginHistoryItem['name'];
  version?: PluginHistoryItem['version'];
}> = (config, { plugin, name, version }) => {
  // Detect if a plugin has already been run on this config.
  if (getHistoryItem(config, name)) {
    return config;
  }

  // Push the history item so duplicates cannot be run.
  config = addHistoryItem(config, { name, version });

  return plugin(config);
};

/**
 * Helper method for creating mods from existing config functions.
 *
 * @param action
 */
export function createRunOncePlugin<T>(
  plugin: ConfigPlugin<T>,
  name: string,
  version?: string
): ConfigPlugin<T> {
  return (config, props) => {
    return withRunOnce(config, { plugin: config => plugin(config, props), name, version });
  };
}
