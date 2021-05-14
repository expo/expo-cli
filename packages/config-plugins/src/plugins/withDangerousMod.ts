import { JSONObject } from '@expo/json-file';

import { ConfigPlugin, Mod, ModPlatform } from '../Plugin.types';
import { assertModResults } from './createBaseMod';
import { withBaseMod, withMod } from './withMod';

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
  return withMod(config, {
    platform,
    mod: 'dangerous',
    action,
  });
};

export const withDangerousBaseMod: ConfigPlugin<ModPlatform> = (config, platform) => {
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
      assertModResults(results, modRequest.platform, modRequest.modName);
      return results;
    },
  });
};
