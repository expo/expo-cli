import { ExpoConfig } from '@expo/config-types';
import { JSONObject } from '@expo/json-file';
import chalk from 'chalk';
import { boolish } from 'getenv';

import { ExportedConfig, ExportedConfigWithProps, Mod, ModPlatform } from '../Plugin.types';

const EXPO_DEBUG = boolish('EXPO_DEBUG', false);

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
    console.log('STACK:', stack);
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
      return (
        first?.match(/^(\bwith[A-Z].*?\b)/)?.[1]?.trim() ??
        first?.match(/\.(\bwith[A-Z].*?\b)/)?.[1]?.trim() ??
        null
      );
    })
    .filter(Boolean)
    .filter(plugin => {
      // redundant as all debug logs are captured in withBaseMod
      return !['withMod', 'withBaseMod', 'withExtendedMod'].includes(plugin!);
    });

  const commonPlugins = ['withPlugins', 'withRunOnce', 'withStaticPlugin'];

  return (
    (plugins as string[])
      .reverse()
      .map((pluginName, index) => {
        // Base mods indicate a logical section.
        if (pluginName.includes('BaseMod')) {
          pluginName = chalk.bold(pluginName);
        }
        // highlight dangerous mods
        if (pluginName.toLowerCase().includes('dangerous')) {
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
      // withExpoAndroidPlugins ➜ withPlugins ➜ withIcons ➜ withDangerousMod ➜ withMod
      .join(' ➜ ')
  );
}

/**
 * Plugin to extend a mod function in the plugins config.
 *
 * @param config exported config
 * @param platform platform to target (ios or android)
 * @param mod name of the platform function to extend
 * @param action method to run on the mod when the config is compiled
 */
export function withMod<T>(
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
