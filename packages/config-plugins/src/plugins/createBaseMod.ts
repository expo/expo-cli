import {
  ConfigPlugin,
  ExportedConfig,
  ExportedConfigWithProps,
  ModConfig,
  ModPlatform,
} from '../Plugin.types';
import { BaseModOptions, withBaseMod } from './withMod';

export type ForwardedBaseModOptions = Partial<
  Pick<BaseModOptions, 'saveToInternal' | 'skipEmptyMod'> & {
    /**
     * Should the file be persisted. i.e. writeAsync.
     * @default true
     */
    persist?: boolean;
  }
>;

export type ModFileProvider<Props = any> = Pick<
  CreateBaseModProps<Props>,
  'readAsync' | 'writeAsync'
>;

export type CreateBaseModProps<
  ModType,
  Props extends ForwardedBaseModOptions = ForwardedBaseModOptions
> = {
  methodName: string;
  platform: ModPlatform;
  modName: string;
  getFilePathAsync: (
    modRequest: ExportedConfigWithProps<ModType>,
    props: Props
  ) => Promise<string> | string;
  readAsync: (
    filePath: string,
    modRequest: ExportedConfigWithProps<ModType>,
    props: Props
  ) => Promise<ModType>;
  writeAsync: (
    filePath: string,
    config: ExportedConfigWithProps<ModType>,
    props: Props
  ) => Promise<void>;
};

export function createBaseMod<
  ModType,
  Props extends ForwardedBaseModOptions = ForwardedBaseModOptions
>({
  methodName,
  platform,
  modName,
  getFilePathAsync,
  readAsync,
  writeAsync,
}: CreateBaseModProps<ModType, Props>): ConfigPlugin<Props | void> {
  const withUnknown: ConfigPlugin<Props | void> = (config, _props) => {
    const props = _props || ({} as Props);
    return withBaseMod<ModType>(config, {
      platform,
      mod: modName,
      skipEmptyMod: props.skipEmptyMod ?? true,
      saveToInternal: props.saveToInternal ?? false,
      async action({ modRequest: { nextMod, ...modRequest }, ...config }) {
        try {
          let results: ExportedConfigWithProps<ModType> = {
            ...config,
            modRequest,
          };

          // Defaults to true unless specified otherwise
          const persist = props.persist !== false;

          let filePath = '';

          try {
            filePath = await getFilePathAsync(results, props);
          } catch (error) {
            // Skip missing file errors if we don't plan on persisting.
            if (persist) throw error;
          }

          const modResults = await readAsync(filePath, results, props);

          results = await nextMod!({
            ...results,
            modResults,
            modRequest,
          });

          assertModResults(results, modRequest.platform, modRequest.modName);

          if (persist) {
            await writeAsync(filePath, results, props);
          }
          return results;
        } catch (error) {
          error.message = `[${platform}.${modName}]: ${methodName}: ${error.message}`;
          throw error;
        }
      },
    });
  };

  if (methodName) {
    Object.defineProperty(withUnknown, 'name', {
      value: methodName,
    });
  }

  return withUnknown;
}

export function assertModResults(results: any, platformName: string, modName: string) {
  // If the results came from a mod, they'd be in the form of [config, data].
  // Ensure the results are an array and omit the data since it should've been written by a data provider plugin.
  const ensuredResults = results;

  // Sanity check to help locate non compliant mods.
  if (!ensuredResults || typeof ensuredResults !== 'object' || !ensuredResults?.mods) {
    throw new Error(
      `Mod \`mods.${platformName}.${modName}\` evaluated to an object that is not a valid project config. Instead got: ${JSON.stringify(
        ensuredResults
      )}`
    );
  }
  return ensuredResults;
}

export function clearMods(config: ExportedConfig, platform: ModPlatform, modNames: string[]) {
  const mods = (config as any).mods as ModConfig;

  for (const platformKey of Object.keys(mods)) {
    if (platformKey !== platform) {
      delete mods[platformKey as ModPlatform];
    }
  }

  for (const key of Object.keys(mods[platform] || {})) {
    if (!modNames.includes(key)) {
      // @ts-ignore
      delete mods[platform][key];
    }
  }
}

function upperFirst(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function createPlatformBaseMod<
  ModType,
  Props extends ForwardedBaseModOptions = ForwardedBaseModOptions
>({ modName, ...props }: Omit<CreateBaseModProps<ModType, Props>, 'methodName'>) {
  // Generate the function name to ensure it's uniform and also to improve stack traces.
  const methodName = `with${upperFirst(props.platform)}${upperFirst(modName)}BaseMod`;
  return createBaseMod<ModType, Props>({
    methodName,
    modName,
    ...props,
  });
}

export function provider<ModType, Props extends ForwardedBaseModOptions = ForwardedBaseModOptions>(
  props: Pick<CreateBaseModProps<ModType, Props>, 'readAsync' | 'getFilePathAsync' | 'writeAsync'>
) {
  return props;
}

export function withGeneratedBaseMods<ModName extends string>(
  config: ExportedConfig,
  {
    platform,
    providers,
    only,
    ...props
  }: ForwardedBaseModOptions & {
    platform: ModPlatform;
    providers: Partial<
      Record<
        ModName,
        Pick<CreateBaseModProps<any, any>, 'readAsync' | 'getFilePathAsync' | 'writeAsync'>
      >
    >;
    only?: ModName[];
  }
): ExportedConfig {
  return Object.entries(providers).reduce((config, [modName, value]) => {
    // Allow skipping mods
    if (only && !only.includes(modName as ModName)) {
      return config;
    }
    const baseMod = createPlatformBaseMod({ platform, modName, ...(value as any) });
    return baseMod(config, props);
  }, config);
}
