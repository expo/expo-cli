import Log from '@expo/bunyan';
import merge from 'deepmerge';
import { Plugin } from 'esbuild';

import aliasPlugin from './plugins/aliasPlugin';
import assetsPlugin from './plugins/assetsPlugin';
import loggingPlugin from './plugins/loggingPlugin';
import patchPlugin from './plugins/patchPlugin';
import removeFlowPlugin from './plugins/removeFlowPlugin';

export function mergePlugins(
  configPlatformPlugins: Plugin[],
  customConfigPlugins: { name: string }[] = []
) {
  const mergedInternalPlugins = [
    'alias',
    'expoLogging',
    'stripFlowTypes',
    'reactNativeAssets',
    'patches',
  ]
    .map(name => {
      const platformConfigPlugin = configPlatformPlugins.find(plugin => plugin.name === name);
      const customConfigPlugin = customConfigPlugins.find(plugin => plugin.name === name);
      return merge(platformConfigPlugin || {}, customConfigPlugin || {});
    })
    .filter(plugin => plugin.name);
  const externalPlugins = customConfigPlugins.filter(plugin => !plugin.name.startsWith('esbuild'));
  return [...mergedInternalPlugins, ...externalPlugins];
}

export function setPlugins(
  projectRoot: string,
  logger: Log,
  plugins: { name: string; params: any }[],
  platform: string,
  cleanCache: boolean
) {
  return plugins.map(plugin => {
    if (plugin.name === 'stripFlowTypes')
      return removeFlowPlugin(projectRoot, plugin.params, cleanCache);
    if (plugin.name === 'alias') return aliasPlugin(plugin.params);
    if (plugin.name === 'expoLogging') return loggingPlugin(logger);
    if (plugin.name === 'reactNativeAssets')
      return assetsPlugin(projectRoot, platform, plugin.params);
    if (plugin.name === 'patches') return patchPlugin;
    return plugin;
  });
}

export function setAssetLoaders(assetExts: string[]) {
  return assetExts.reduce<Record<string, string>>((loaders, ext) => {
    loaders['.' + ext] = 'file';
    return loaders;
  }, {});
}
