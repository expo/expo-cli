import { ExpoConfig } from '@expo/config-types';

import { ModPlatform } from '../Plugin.types';

export type PluginHistoryItem = {
  name: string;
  version: string;
  platform?: ModPlatform;
};

export function getHistoryItem(
  config: Pick<ExpoConfig, 'extra'>,
  name: string
): PluginHistoryItem | null {
  return config.extra?._pluginHistory?.[name] ?? null;
}

export function addHistoryItem(
  config: ExpoConfig,
  item: Omit<PluginHistoryItem, 'version'> & { version?: string }
): ExpoConfig {
  if (!config.extra) {
    config.extra = {};
  }
  if (!config.extra._pluginHistory) {
    config.extra._pluginHistory = {};
  }

  if (!item.version) {
    item.version = 'UNVERSIONED';
  }

  config.extra._pluginHistory[item.name] = item;

  return config;
}
