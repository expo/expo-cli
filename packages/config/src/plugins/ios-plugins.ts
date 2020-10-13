import { JSONObject } from '@expo/json-file';
import { XcodeProject } from 'xcode';

import {
  ExpoConfig,
  ExportedConfig,
  IOSPluginModifierProps,
  PluginModifier,
} from '../Config.types';
import { ExpoPlist, InfoPlist } from '../ios/IosConfig.types';
import { withModifier } from './core-plugins';

export const withInfoPlist = (
  { expo, ...config }: ExportedConfig,
  action: (expo: ExpoConfig, infoPlist: InfoPlist) => InfoPlist
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

export function withEntitlementsPlist(
  config: ExportedConfig,
  action: PluginModifier<IOSPluginModifierProps<JSONObject>>
): ExportedConfig {
  return withModifier<IOSPluginModifierProps<JSONObject>>(config, 'ios', 'entitlements', action);
}

export function withExpoPlist(
  config: ExportedConfig,
  action: PluginModifier<IOSPluginModifierProps<ExpoPlist>>
): ExportedConfig {
  return withModifier<IOSPluginModifierProps<ExpoPlist>>(config, 'ios', 'expoPlist', action);
}

export function withXcodeProj(
  config: ExportedConfig,
  action: PluginModifier<IOSPluginModifierProps<XcodeProject>>
): ExportedConfig {
  return withModifier<IOSPluginModifierProps<XcodeProject>>(config, 'ios', 'xcodeproj', action);
}
