import { JSONObject } from '@expo/json-file';
import { XcodeProject } from 'xcode';

import {
  ConfigPlugin,
  ExpoConfig,
  ExportedConfig,
  IOSPluginModifierProps,
  PluginModifier,
} from '../Config.types';
import { ExpoPlist, InfoPlist } from '../ios/IosConfig.types';
import { withModifier } from './core-plugins';

type MutateInfoPlistAction = (expo: ExpoConfig, infoPlist: InfoPlist) => InfoPlist;

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

export function createInfoPlistPlugin(
  action: MutateInfoPlistAction
): ConfigPlugin<MutateInfoPlistAction> {
  return config => withInfoPlist(config, action);
}

export const withEntitlementsPlist: ConfigPlugin<PluginModifier<
  IOSPluginModifierProps<JSONObject>
>> = (config, action) => {
  return withModifier(config, {
    platform: 'ios',
    modifier: 'entitlements',
    action,
  });
};

export const withExpoPlist: ConfigPlugin<PluginModifier<IOSPluginModifierProps<ExpoPlist>>> = (
  config,
  action
) => {
  return withModifier(config, {
    platform: 'ios',
    modifier: 'expoPlist',
    action,
  });
};

export const withXcodeProj: ConfigPlugin<PluginModifier<IOSPluginModifierProps<XcodeProject>>> = (
  config,
  action
) => {
  return withModifier(config, {
    platform: 'ios',
    modifier: 'xcodeproj',
    action,
  });
};
