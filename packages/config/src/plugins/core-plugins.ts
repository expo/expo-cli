import {
  ConfigPlugin,
  ExportedConfig,
  ExportedConfigWithProps,
  Mod,
  ModPlatform,
} from '../Plugin.types';

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
export const withPlugins: ConfigPlugin<
  (
    | ConfigPlugin
    // TODO: Type this somehow if possible.
    | [ConfigPlugin<any>, any]
  )[]
> = (config, plugins): ExportedConfig => {
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
 * @param skipEmptyMod should skip running the action if there is no existing mod to intercept
 * @param action method to run on the mod when the config is compiled
 */
export function withInterceptedMod<T>(
  config: ExportedConfig,
  {
    platform,
    mod,
    action,
    skipEmptyMod,
  }: {
    platform: ModPlatform;
    mod: string;
    action: Mod<T>;
    skipEmptyMod?: boolean;
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
    if (skipEmptyMod) {
      // Skip running the action
      return config;
    }
    // Use a noop mod and continue
    const noopMod: Mod<T> = config => config;
    interceptedMod = noopMod;
  }

  async function interceptingMod({ modRequest, ...config }: ExportedConfigWithProps<T>) {
    return action({ ...config, modRequest: { ...modRequest, nextMod: interceptedMod } });
  }

  (config.mods[platform] as any)[mod] = interceptingMod;

  return config;
}
