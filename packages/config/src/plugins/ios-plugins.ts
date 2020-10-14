import { JSONObject } from '@expo/json-file';
import { XcodeProject } from 'xcode';

import {
  ConfigDataModifierPlugin,
  ConfigPlugin,
  ExpoConfig,
  ExportedConfig,
  IOSPluginModifierProps,
} from '../Config.types';
import { ExpoPlist, InfoPlist } from '../ios/IosConfig.types';
import { withModifier } from './core-plugins';

type MutateInfoPlistAction = (expo: ExpoConfig, infoPlist: InfoPlist) => InfoPlist;

export function createInfoPlistPlugin(
  action: MutateInfoPlistAction
): ConfigPlugin<MutateInfoPlistAction> {
  return config => withInfoPlist(config, action);
}

export const withInfoPlist: ConfigPlugin<MutateInfoPlistAction> = (
  { expo, ...config },
  action
): ExportedConfig => {
  if (!expo.ios) {
    expo.ios = {};
  }
  if (!expo.ios.infoPlist) {
    expo.ios.infoPlist = {};
  }

  expo.ios.infoPlist = action(expo, expo.ios.infoPlist);

  return { expo, ...config };
};

export const withEntitlementsPlist: ConfigPlugin<ConfigDataModifierPlugin<
  IOSPluginModifierProps<JSONObject>
>> = (config, action) => {
  return withModifier(config, {
    platform: 'ios',
    modifier: 'entitlements',
    action,
  });
};

export const withExpoPlist: ConfigPlugin<ConfigDataModifierPlugin<
  IOSPluginModifierProps<ExpoPlist>
>> = (config, action) => {
  return withModifier(config, {
    platform: 'ios',
    modifier: 'expoPlist',
    action,
  });
};

export const withXcodeProject: ConfigPlugin<ConfigDataModifierPlugin<
  IOSPluginModifierProps<XcodeProject>
>> = (config, action) => {
  return withModifier(config, {
    platform: 'ios',
    modifier: 'xcodeproj',
    action,
  });
};
