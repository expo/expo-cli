import { ExpoConfig } from '@expo/config-types';
import { JSONObject } from '@expo/json-file';
import { XcodeProject } from 'xcode';

import { ConfigPlugin, Mod } from '../Plugin.types';
import { ExpoPlist, InfoPlist } from '../ios/IosConfig.types';
import { withExtendedMod } from './core-plugins';

type MutateInfoPlistAction = (expo: ExpoConfig, infoPlist: InfoPlist) => InfoPlist;

/**
 * Helper method for creating mods from existing config functions.
 *
 * @param action
 */
export function createInfoPlistPlugin(action: MutateInfoPlistAction, name?: string): ConfigPlugin {
  const withUnknown: ConfigPlugin = config =>
    withInfoPlist(config, async config => {
      config.modResults = await action(config, config.modResults);
      return config;
    });
  if (name) {
    Object.defineProperty(withUnknown, 'name', {
      value: name,
    });
  }
  return withUnknown;
}

type MutateEntitlementsPlistAction = (expo: ExpoConfig, entitlements: JSONObject) => JSONObject;

/**
 * Helper method for creating mods from existing config functions.
 *
 * @param action
 */
export function createEntitlementsPlugin(
  action: MutateEntitlementsPlistAction,
  name: string
): ConfigPlugin {
  const withUnknown: ConfigPlugin = config =>
    withEntitlementsPlist(config, async config => {
      config.modResults = await action(config, config.modResults);
      return config;
    });
  if (name) {
    Object.defineProperty(withUnknown, 'name', {
      value: name,
    });
  }
  return withUnknown;
}

/**
 * Provides the Info.plist file for modification.
 * Keeps the config's expo.ios.infoPlist object in sync with the data.
 *
 * @param config
 * @param action
 */
export const withInfoPlist: ConfigPlugin<Mod<InfoPlist>> = (config, action) => {
  return withExtendedMod<InfoPlist>(config, {
    platform: 'ios',
    mod: 'infoPlist',
    async action(config) {
      config = await action(config);
      if (!config.ios) {
        config.ios = {};
      }
      config.ios.infoPlist = config.modResults;
      return config;
    },
  });
};

/**
 * Provides the main .entitlements file for modification.
 * Keeps the config's expo.ios.entitlements object in sync with the data.
 *
 * @param config
 * @param action
 */
export const withEntitlementsPlist: ConfigPlugin<Mod<JSONObject>> = (config, action) => {
  return withExtendedMod<JSONObject>(config, {
    platform: 'ios',
    mod: 'entitlements',
    async action(config) {
      config = await action(config);
      if (!config.ios) {
        config.ios = {};
      }
      config.ios.entitlements = config.modResults;
      return config;
    },
  });
};

/**
 * Provides the Expo.plist for modification.
 *
 * @param config
 * @param action
 */
export const withExpoPlist: ConfigPlugin<Mod<ExpoPlist>> = (config, action) => {
  return withExtendedMod(config, {
    platform: 'ios',
    mod: 'expoPlist',
    action,
  });
};

/**
 * Provides the main .xcodeproj for modification.
 *
 * @param config
 * @param action
 */
export const withXcodeProject: ConfigPlugin<Mod<XcodeProject>> = (config, action) => {
  return withExtendedMod(config, {
    platform: 'ios',
    mod: 'xcodeproj',
    action,
  });
};
