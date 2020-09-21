import { XcodeProject } from 'xcode';

import {
  ExpoConfig,
  ExportedConfig,
  IOSPackXcodeProjModifier,
  PackModifier,
} from '../Config.types';
import { InfoPlist, Plist } from '../ios/IosConfig.types';
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

export const withEntitlementsPlist = (
  { expo, ...config }: ExportedConfig,
  action: (expo: ExpoConfig, plist: Plist) => Plist
): ExportedConfig => {
  if (!expo.ios) expo.ios = {};
  if (!expo.ios.entitlements) expo.ios.entitlements = {};

  expo.ios.entitlements = action(expo, expo.ios.entitlements);

  return { expo, ...config };
};

export function withXcodeProj(
  { expo, pack }: ExportedConfig,
  action: PackModifier<IOSPackXcodeProjModifier>
): ExportedConfig {
  return withModifier<IOSPackXcodeProjModifier>({ expo, pack }, 'ios', 'xcodeproj', action);
}
