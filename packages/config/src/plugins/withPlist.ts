import fs from 'fs-extra';
import xcode, { XcodeProject } from 'xcode';

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

export function withAllPbxproj(
  config: ExportedConfig,
  action: PackModifier<IOSPackModifierProps<XcodeProject[]>>
): ExportedConfig {
  return withModifier<IOSPackModifierProps<XcodeProject[]>>(config, 'ios', 'after', props => {
    const keys = Object.keys(props.files).filter(file => file.endsWith('project.pbxproj'));
    const data = keys.map(key => {
      const project = xcode.project(props.files[key]._path);
      project.parseSync();
      return project;
    });

    // this isn't fully compliant with the in-memory filesystem. Rewrite now so xcode projects can be read correctly in other plugins.
    for (const project of data) {
      fs.writeFileSync(project.filepath, project.writeSync());
    }

    return action({ ...props, data });
  });
}
