import { JSONObject } from '@expo/json-file';
import { XcodeProject } from 'xcode';

import {
  ConfigModifierPlugin,
  ConfigPlugin,
  ExpoConfig,
  PluginModifierProps,
} from '../Config.types';
import { ExpoPlist, InfoPlist } from '../ios/IosConfig.types';
import { withExtendedModifier } from './core-plugins';

type MutateInfoPlistAction = (expo: ExpoConfig, infoPlist: InfoPlist) => InfoPlist;

/**
 * Helper method for creating modifiers from existing config functions.
 *
 * @param action
 */
export function createInfoPlistPlugin(
  action: MutateInfoPlistAction
): ConfigPlugin<MutateInfoPlistAction> {
  return config =>
    withInfoPlist(config, async config => {
      config.props.data = await action(config.expo, config.props.data);
      return config;
    });
}

/**
 * Provides the Info.plist file for modification.
 * Keeps the config's expo.ios.infoPlist object in sync with the data.
 *
 * @param config
 * @param action
 */
export const withInfoPlist: ConfigPlugin<ConfigModifierPlugin<PluginModifierProps<InfoPlist>>> = (
  config,
  action
) => {
  return withExtendedModifier<PluginModifierProps<InfoPlist>>(config, {
    platform: 'ios',
    modifier: 'infoPlist',
    async action(config) {
      config = await action(config);
      if (!config.expo.ios) {
        config.expo.ios = {};
      }
      config.expo.ios.infoPlist = config.props.data;
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
export const withEntitlementsPlist: ConfigPlugin<ConfigModifierPlugin<
  PluginModifierProps<JSONObject>
>> = (config, action) => {
  return withExtendedModifier<PluginModifierProps<JSONObject>>(config, {
    platform: 'ios',
    modifier: 'entitlements',
    async action(config) {
      config = await action(config);
      if (!config.expo.ios) {
        config.expo.ios = {};
      }
      config.expo.ios.entitlements = config.props.data;
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
export const withExpoPlist: ConfigPlugin<ConfigModifierPlugin<PluginModifierProps<ExpoPlist>>> = (
  config,
  action
) => {
  return withExtendedModifier(config, {
    platform: 'ios',
    modifier: 'expoPlist',
    action,
  });
};

/**
 * Provides the main .xcodeproj for modification.
 *
 * @param config
 * @param action
 */
export const withXcodeProject: ConfigPlugin<ConfigModifierPlugin<
  PluginModifierProps<XcodeProject>
>> = (config, action) => {
  return withExtendedModifier(config, {
    platform: 'ios',
    modifier: 'xcodeproj',
    action,
  });
};

/**
 * Modifiers that don't modify any data, all unresolved functionality is performed inside a dangerous modifier.
 *
 * @param config
 * @param action
 */
export const withDangerousModifier: ConfigPlugin<ConfigModifierPlugin<
  PluginModifierProps<unknown>
>> = (config, action) => {
  return withExtendedModifier(config, {
    platform: 'ios',
    modifier: 'dangerous',
    action,
  });
};
