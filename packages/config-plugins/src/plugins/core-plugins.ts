import { ExpoConfig } from '@expo/config-types';
import { JSONObject } from '@expo/json-file';
import assert from 'assert';
import chalk from 'chalk';
import { boolish } from 'getenv';

import {
  ConfigPlugin,
  ExportedConfig,
  ExportedConfigWithProps,
  Mod,
  ModPlatform,
  StaticPlugin,
} from '../Plugin.types';
import { addHistoryItem, getHistoryItem, PluginHistoryItem } from '../utils/history';
import { withStaticPlugin } from './static-plugins';

const EXPO_DEBUG = boolish('EXPO_DEBUG', false);

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

/**
 * Mods that don't modify any data, all unresolved functionality is performed inside a dangerous mod.
 * All dangerous mods run first before other mods.
 *
 * @param config
 * @param platform
 * @param action
 */
export const withDangerousMod: ConfigPlugin<[ModPlatform, Mod<unknown>]> = (
  config,
  [platform, action]
) => {
  return withExtendedMod(config, {
    platform,
    mod: 'dangerous',
    action,
  });
};

/**
 * Plugin to extend a mod function in the plugins config.
 *
 * @param config exported config
 * @param platform platform to target (ios or android)
 * @param mod name of the platform function to extend
 * @param action method to run on the mod when the config is compiled
 */
export function withExtendedMod<T>(
  config: ExportedConfig,
  {
    platform,
    mod,
    action,
  }: {
    platform: ModPlatform;
    mod: string;
    action: Mod<T>;
  }
): ExportedConfig {
  return withBaseMod(config, {
    platform,
    mod,
    async action({ modRequest: { nextMod, ...modRequest }, modResults, ...config }) {
      const results = await action({ modRequest, modResults: modResults as T, ...config });
      return nextMod!(results as any);
    },
  });
}

export type BaseModOptions = {
  platform: ModPlatform;
  mod: string;
  skipEmptyMod?: boolean;
  saveToInternal?: boolean;
};

/**
 * Plugin to intercept execution of a given `mod` with the given `action`.
 * If an action was already set on the given `config` config for `mod`, then it
 * will be provided to the `action` as `nextMod` when it's evaluated, otherwise
 * `nextMod` will be an identity function.
 *
 * @param config exported config
 * @param platform platform to target (ios or android)
 * @param mod name of the platform function to intercept
 * @param skipEmptyMod should skip running the action if there is no existing mod to intercept
 * @param saveToInternal should save the results to `_internal.modResults`, only enable this when the results are pure JSON.
 * @param action method to run on the mod when the config is compiled
 */
export function withBaseMod<T>(
  config: ExportedConfig,
  { platform, mod, action, skipEmptyMod, saveToInternal }: BaseModOptions & { action: Mod<T> }
): ExportedConfig {
  if (!config.mods) {
    config.mods = {};
  }
  if (!config.mods[platform]) {
    config.mods[platform] = {};
  }

  let interceptedMod: Mod<T> = (config.mods[platform] as Record<string, any>)[mod];

  // No existing mod to intercept
  if (!interceptedMod) {
    if (skipEmptyMod) {
      // Skip running the action
      return config;
    }
    // Use a noop mod and continue
    const noopMod: Mod<T> = config => config;
    interceptedMod = noopMod;
  }

  // Create a stack trace for debugging ahead of time
  let debugTrace: string = '';
  // Use the possibly user defined value. Otherwise fallback to the env variable.
  // We support the env variable because user mods won't have _internal defined in time.
  const isDebug = config._internal?.isDebug ?? EXPO_DEBUG;
  if (isDebug) {
    // Get a stack trace via the Error API
    const stack = new Error().stack;
    // Format the stack trace to create the debug log
    debugTrace = getDebugPluginStackFromStackTrace(stack);
    const modStack = chalk.bold(`${platform}.${mod}`);

    debugTrace = `${modStack}: ${debugTrace}`;
  }

  async function interceptingMod({ modRequest, ...config }: ExportedConfigWithProps<T>) {
    if (isDebug) {
      // In debug mod, log the plugin stack in the order which they were invoked
      console.log(debugTrace);
    }
    const results = await action({
      ...config,
      modRequest: { ...modRequest, nextMod: interceptedMod },
    });

    if (saveToInternal) {
      saveToInternalObject(results, platform, mod, (results.modResults as unknown) as JSONObject);
    }
    return results;
  }

  (config.mods[platform] as any)[mod] = interceptingMod;

  return config;
}

function saveToInternalObject(
  config: Pick<ExpoConfig, '_internal'>,
  platformName: ModPlatform,
  modName: string,
  results: JSONObject
) {
  if (!config._internal) config._internal = {};
  if (!config._internal.modResults) config._internal.modResults = {};
  if (!config._internal.modResults[platformName]) config._internal.modResults[platformName] = {};
  config._internal.modResults[platformName][modName] = results;
}

function getDebugPluginStackFromStackTrace(stacktrace?: string): string {
  if (!stacktrace) {
    return '';
  }

  const treeStackLines: string[] = [];
  for (const line of stacktrace.split('\n')) {
    const [first, second] = line.trim().split(' ');
    if (first === 'at') {
      treeStackLines.push(second);
    }
  }

  const plugins = treeStackLines
    .map(first => {
      // Match the first part of the stack trace against the plugin naming convention
      // "with" followed by a capital letter.
      const match = first?.match(/(\bwith[A-Z].*?\b)/g);
      if (match?.length) {
        // Return the plugin name
        return match[0];
      }
      return null;
    })
    .filter(Boolean);

  // redundant as all debug logs are captured in withBaseMod
  if (plugins[0] === 'withBaseMod') {
    plugins.shift();
  }

  const commonPlugins = ['withPlugins', 'withExtendedMod'];

  return (
    (plugins as string[])
      .reverse()
      .map((pluginName, index) => {
        // Base mods indicate a logical section.
        if (pluginName.includes('BaseMod')) {
          pluginName = chalk.bold(pluginName);
        }
        // highlight dangerous mods
        if (pluginName.toLowerCase().includes('danger')) {
          pluginName = chalk.red(pluginName);
        }

        if (index === 0) {
          return chalk.blue(pluginName);
        } else if (commonPlugins.includes(pluginName)) {
          // Common mod names often clutter up the logs, dim them out
          return chalk.dim(pluginName);
        }
        return pluginName;
      })
      // Join the results:
      // withExpoAndroidPlugins ➜ withPlugins ➜ withIcons ➜ withDangerousMod ➜ withExtendedMod
      .join(' ➜ ')
  );
}
