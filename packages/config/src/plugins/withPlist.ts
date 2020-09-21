import { XcodeProject } from 'xcode';

import { ExpoConfig, ExportedConfig, IOSPackModifierProps, PackModifier } from '../Config.types';
import { ExpoPlist, InfoPlist, Plist } from '../ios/IosConfig.types';
import { withModifier } from './withAfter';

export const withInfoPlist = (
  { expo, ...config }: ExportedConfig,
  action: (expo: ExpoConfig, infoPlist: InfoPlist) => InfoPlist
): ExportedConfig => {
  if (!expo.ios) expo.ios = {};
  if (!expo.ios.infoPlist) expo.ios.infoPlist = {};

  expo.ios.infoPlist = action(expo, expo.ios.infoPlist);

  return { expo, ...config };
};

export function withEntitlementsPlist(
  config: ExportedConfig,
  action: PackModifier<IOSPackModifierProps<Plist>>
): ExportedConfig {
  return withModifier<IOSPackModifierProps<Plist>>(config, 'ios', 'entitlements', action);
}

export function withExpoPlist(
  config: ExportedConfig,
  action: PackModifier<IOSPackModifierProps<ExpoPlist>>
): ExportedConfig {
  return withModifier<IOSPackModifierProps<ExpoPlist>>(config, 'ios', 'expoPlist', action);
}

export function withXcodeProj(
  config: ExportedConfig,
  action: PackModifier<IOSPackModifierProps<XcodeProject>>
): ExportedConfig {
  return withModifier<IOSPackModifierProps<XcodeProject>>(config, 'ios', 'xcodeproj', action);
}
