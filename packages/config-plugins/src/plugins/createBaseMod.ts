import {
  ConfigPlugin,
  ExportedConfig,
  ExportedConfigWithProps,
  ModConfig,
  ModPlatform,
} from '../Plugin.types';
import { BaseModOptions, withBaseMod } from './withMod';

export type ForwardedBaseModOptions = Partial<
  Pick<BaseModOptions, 'saveToInternal' | 'skipEmptyMod'>
>;

export type CreateBaseModProps<
  ModType,
  Props extends ForwardedBaseModOptions = ForwardedBaseModOptions
> = {
  methodName: string;
  platform: ModPlatform;
  modName: string;
  readAsync: (
    modRequest: ExportedConfigWithProps<ModType>,
    props: Props
  ) => Promise<{ contents: ModType; filePath: string }>;
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
  readAsync,
  writeAsync,
}: {
  methodName: string;
  platform: ModPlatform;
  modName: string;
  readAsync: (
    modRequest: ExportedConfigWithProps<ModType>,
    props: Props
  ) => Promise<{ contents: ModType; filePath: string }>;
  writeAsync: (
    filePath: string,
    config: ExportedConfigWithProps<ModType>,
    props: Props
  ) => Promise<void>;
}): ConfigPlugin<Props | void> {
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

          const { contents: modResults, filePath } = await readAsync(results, props);

          results = await nextMod!({
            ...config,
            modResults,
            modRequest,
          });

          assertModResults(results, modRequest.platform, modRequest.modName);

          await writeAsync(filePath, results, props);
          return results;
        } catch (error) {
          console.error(`[${platform}.${modName}]: ${methodName} error:`);
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
  const methodName = `with${upperFirst(props.platform)}${upperFirst(modName)}BaseMod`;
  return createBaseMod<ModType, Props>({
    methodName,
    modName,
    ...props,
  });
}

export function provider<ModType, Props extends ForwardedBaseModOptions = ForwardedBaseModOptions>(
  props: Pick<CreateBaseModProps<ModType, Props>, 'readAsync' | 'writeAsync'>
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
    providers: Record<ModName, Pick<CreateBaseModProps<any, any>, 'readAsync' | 'writeAsync'>>;
    only?: ModName[];
  }
): ExportedConfig {
  return Object.entries(providers).reduce((config, [modName, value]) => {
    if (only && !only.includes(modName as ModName)) {
      return config;
    }
    return createPlatformBaseMod({ platform, modName, ...(value as any) })(config, props);
  }, config);
}
