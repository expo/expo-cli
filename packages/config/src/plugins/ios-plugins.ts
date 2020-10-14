import { JSONObject } from '@expo/json-file';
import { XcodeProject } from 'xcode';

import {
  ConfigModifierPlugin,
  ConfigPlugin,
  ExpoConfig,
  IOSPluginModifierProps,
} from '../Config.types';
import { ExpoPlist, InfoPlist } from '../ios/IosConfig.types';
import { withExtendedModifier } from './core-plugins';

type MutateInfoPlistAction = (expo: ExpoConfig, infoPlist: InfoPlist) => InfoPlist;

export function createInfoPlistPlugin(
  action: MutateInfoPlistAction
): ConfigPlugin<MutateInfoPlistAction> {
  return config =>
    withInfoPlist(config, async (config, props) => [
      config,
      { ...props, data: await action(config.expo, props.data) },
    ]);
}

export const withInfoPlist: ConfigPlugin<ConfigModifierPlugin<
  IOSPluginModifierProps<InfoPlist>
>> = (config, action) => {
  return withExtendedModifier(config, {
    platform: 'ios',
    modifier: 'infoPlist',
    action,
  });
};

export const withEntitlementsPlist: ConfigPlugin<ConfigModifierPlugin<
  IOSPluginModifierProps<JSONObject>
>> = (config, action) => {
  return withExtendedModifier(config, {
    platform: 'ios',
    modifier: 'entitlements',
    action,
  });
};

export const withExpoPlist: ConfigPlugin<ConfigModifierPlugin<
  IOSPluginModifierProps<ExpoPlist>
>> = (config, action) => {
  return withExtendedModifier(config, {
    platform: 'ios',
    modifier: 'expoPlist',
    action,
  });
};

export const withXcodeProject: ConfigPlugin<ConfigModifierPlugin<
  IOSPluginModifierProps<XcodeProject>
>> = (config, action) => {
  return withExtendedModifier(config, {
    platform: 'ios',
    modifier: 'xcodeproj',
    action,
  });
};
