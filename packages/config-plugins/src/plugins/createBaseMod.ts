import { JSONObject } from '@expo/json-file';

import { ConfigPlugin, ExportedConfigWithProps, ModPlatform } from '../Plugin.types';
import { BaseModOptions, withBaseMod } from './core-plugins';

export type ForwardedBaseModOptions = Partial<
  Pick<BaseModOptions, 'saveToInternal' | 'skipEmptyMod'>
>;

export function createBaseMod<
  ModType,
  Props extends ForwardedBaseModOptions = ForwardedBaseModOptions
>({
  methodName,
  platform,
  modName,
  readContentsAsync,
  writeContentsAsync,
}: {
  methodName: string;
  platform: ModPlatform;
  modName: string;
  readContentsAsync: (
    modRequest: ExportedConfigWithProps<ModType>,
    props: Props
  ) => Promise<{ contents: ModType; filePath: string }>;
  writeContentsAsync: (
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

          const { contents: modResults, filePath } = await readContentsAsync(results, props);

          results = await nextMod!({
            ...config,
            modResults,
            modRequest,
          });

          resolveModResults(results, modRequest.platform, modRequest.modName);

          await writeContentsAsync(filePath, results, props);
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

export function resolveModResults(results: any, platformName: string, modName: string) {
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

export const withExpoDangerousBaseMod: ConfigPlugin<ModPlatform> = (config, platform) => {
  // Used for scheduling when dangerous mods run.
  return withBaseMod<JSONObject>(config, {
    platform,
    mod: 'dangerous',
    skipEmptyMod: true,
    async action({ modRequest: { nextMod, ...modRequest }, ...config }) {
      const results = await nextMod!({
        ...config,
        modRequest,
      });
      resolveModResults(results, modRequest.platform, modRequest.modName);
      return results;
    },
  });
};
