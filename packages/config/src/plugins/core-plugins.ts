import chalk from 'chalk';
import { boolish } from 'getenv';

import {
  ConfigPlugin,
  ExportedConfig,
  ExportedConfigWithProps,
  Mod,
  ModPlatform,
} from '../Plugin.types';

const EXPO_DEBUG = boolish('EXPO_DEBUG', false);

function ensureArray<T>(input: T | T[]): T[] {
  if (Array.isArray(input)) {
    return input;
  }
  return [input];
}

/**
 * Plugin to chain a list of plugins together.
 *
 * @param config exported config
 * @param plugins list of config config plugins to apply to the exported config
 */
export const withPlugins: ConfigPlugin<(
  | ConfigPlugin
  // TODO: Type this somehow if possible.
  | [ConfigPlugin<any>, any]
)[]> = (config, plugins): ExportedConfig => {
  return plugins.reduce((prev, curr) => {
    const [plugins, args] = ensureArray(curr);
    return plugins(prev, args);
  }, config);
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
  return withInterceptedMod(config, {
    platform,
    mod,
    async action({ modRequest: { nextMod, ...modRequest }, modResults, ...config }) {
      const results = await action({ modRequest, modResults: modResults as T, ...config });
      return nextMod!(results as any);
    },
  });
}

/**
 * Plugin to intercept execution of a given `mod` with the given `action`.
 * If an action was already set on the given `config` config for `mod`, then it
 * will be provided to the `action` as `nextMod` when it's evaluated, otherwise
 * `nextMod` will be an identity function.
 *
 * @param config exported config
 * @param platform platform to target (ios or android)
 * @param mod name of the platform function to intercept
 * @param skipEmptyChain should skip running the action if there is no existing mod to intercept
 * @param action method to run on the mod when the config is compiled
 */
export function withInterceptedMod<T>(
  config: ExportedConfig,
  {
    platform,
    mod,
    action,
    skipEmptyChain,
  }: {
    platform: ModPlatform;
    mod: string;
    action: Mod<T>;
    skipEmptyChain?: boolean;
  }
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
    if (skipEmptyChain) {
      // Skip running the action
      return config;
    }
    // Use a noop mod and continue
    const noopMod: Mod<T> = config => config;
    interceptedMod = noopMod;
  }

  // Create a stack trace for debugging ahead of time
  let debugTrace: string = '';
  if (EXPO_DEBUG) {
    // Get a stack trace via the Error API
    const stack = new Error().stack;
    // Format the stack trace to create the debug log
    debugTrace = getDebugPluginStackFromStackTrace(stack);
  }

  async function interceptingMod({ modRequest, ...config }: ExportedConfigWithProps<T>) {
    if (EXPO_DEBUG) {
      // In debug mod, log the plugin stack in the order which they were invoked
      const modStack = chalk.bold(`${platform}.${mod}`);
      console.log(`${modStack}: ${debugTrace}`);
    }
    return action({ ...config, modRequest: { ...modRequest, nextMod: interceptedMod } });
  }

  (config.mods[platform] as any)[mod] = interceptingMod;

  return config;
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

  // redundant as all debug logs are captured in withInterceptedMod
  if (plugins[0] === 'withInterceptedMod') {
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
      // withExpoAndroidPlugins ➜ withPlugins ➜ withIcons ➜ withDangerousAndroidMod ➜ withExtendedMod
      .join(' ➜ ')
  );
}
