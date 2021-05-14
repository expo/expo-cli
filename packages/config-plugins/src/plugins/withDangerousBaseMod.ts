import { JSONObject } from '@expo/json-file';

import { ConfigPlugin, ModPlatform } from '../Plugin.types';
import { withBaseMod } from './core-plugins';
import { resolveModResults } from './createBaseMod';

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
      resolveModResults(results, modRequest.platform, modRequest.modName);
      return results;
    },
  });
};
