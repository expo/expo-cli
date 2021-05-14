import { JSONObject } from '@expo/json-file';
import plist from '@expo/plist';
import assert from 'assert';
import { readFile, writeFile } from 'fs-extra';
import path from 'path';
import { XcodeProject } from 'xcode';

import { ExportedConfig } from '../Plugin.types';
import { getEntitlementsPath } from '../ios/Entitlements';
import { InfoPlist } from '../ios/IosConfig.types';
import { AppDelegateProjectFile, getAppDelegate, getInfoPlistPath } from '../ios/Paths';
import { getPbxproj } from '../ios/utils/Xcodeproj';
import { createBaseMod, ForwardedBaseModOptions, withExpoDangerousBaseMod } from './createBaseMod';

export function withBaseIosMods(config: ExportedConfig): ExportedConfig {
  config = withExpoDangerousBaseMod(config, 'ios');
  config = withIOSAppDelegateBaseMod(config);
  config = withIOSInfoPlistBaseMod(config);
  config = withIOSExpoPlistBaseMod(config);
  config = withIOSXcodeProjectBaseMod(config);
  config = withIOSEntitlementsPlistBaseMod(config);

  return config;
}

// Append a rule to supply AppDelegate data to mods on `mods.ios.appDelegate`
export const withIOSAppDelegateBaseMod = createBaseMod<AppDelegateProjectFile>({
  methodName: 'withIOSAppDelegateBaseMod',
  platform: 'ios',
  modName: 'appDelegate',
  async readAsync({ modRequest: { projectRoot } }) {
    const modResults = await getAppDelegate(projectRoot);
    return { filePath: modResults.path, contents: modResults };
  },
  async writeAsync(filePath, { modResults: { contents } }) {
    await writeFile(filePath, contents);
  },
});

// Append a rule to supply Expo.plist data to mods on `mods.ios.expoPlist`
export const withIOSExpoPlistBaseMod = createBaseMod<JSONObject>({
  methodName: 'withIOSExpoPlistBaseMod',
  platform: 'ios',
  modName: 'expoPlist',
  async readAsync({ modRequest: { platformProjectRoot, projectName } }) {
    const supportingDirectory = path.join(platformProjectRoot, projectName!, 'Supporting');
    const filePath = path.resolve(supportingDirectory, 'Expo.plist');
    const modResults = plist.parse(await readFile(filePath, 'utf8'));
    return { filePath, contents: modResults };
  },
  async writeAsync(filePath, { modResults }) {
    await writeFile(filePath, plist.build(modResults));
  },
});

// Append a rule to supply .xcodeproj data to mods on `mods.ios.xcodeproj`
export const withIOSXcodeProjectBaseMod = createBaseMod<XcodeProject>({
  methodName: 'withIOSExpoPlistBaseMod',
  platform: 'ios',
  modName: 'xcodeproj',
  async readAsync({ modRequest: { projectRoot } }) {
    const contents = getPbxproj(projectRoot);
    return { filePath: contents.filepath, contents };
  },
  async writeAsync(filePath, { modResults }) {
    await writeFile(filePath, modResults.writeSync());
  },
});

// Append a rule to supply Info.plist data to mods on `mods.ios.infoPlist`
export const withIOSInfoPlistBaseMod = createBaseMod<
  InfoPlist,
  ForwardedBaseModOptions & { noPersist?: boolean }
>({
  methodName: 'withIOSInfoPlistBaseMod',
  platform: 'ios',
  modName: 'infoPlist',
  async readAsync(config, props) {
    let filePath = '';
    try {
      filePath = getInfoPlistPath(config.modRequest.projectRoot);
    } catch (error) {
      // Skip missing file errors in dry run mode since we don't write anywhere.
      if (!props.noPersist) throw error;
    }

    // Apply all of the Info.plist values to the expo.ios.infoPlist object
    // TODO: Remove this in favor of just overwriting the Info.plist with the Expo object. This will enable people to actually remove values.
    if (!config.ios) {
      config.ios = {};
    }
    if (!config.ios.infoPlist) {
      config.ios.infoPlist = {};
    }

    let data: InfoPlist = {};
    try {
      const contents = await readFile(filePath, 'utf8');
      assert(contents, 'Info.plist is empty');
      data = plist.parse(contents);
    } catch (error) {
      if (!props.noPersist) throw error;
      // If the file is invalid or doesn't exist, fallback on a default blank object.
      data = {
        // TODO: Maybe sync with template
      };
    }

    config.ios.infoPlist = {
      ...(data || {}),
      ...config.ios.infoPlist,
    };

    return { filePath, contents: data };
  },
  async writeAsync(filePath, config, props) {
    // Update the contents of the static infoPlist object
    if (!config.ios) {
      config.ios = {};
    }
    config.ios.infoPlist = config.modResults;

    if (!props.noPersist) {
      await writeFile(filePath, plist.build(config.modResults));
    }
  },
});

// Append a rule to supply .entitlements data to mods on `mods.ios.entitlements`
export const withIOSEntitlementsPlistBaseMod = createBaseMod<
  InfoPlist,
  ForwardedBaseModOptions & { noPersist?: boolean }
>({
  methodName: 'withIOSEntitlementsPlistBaseMod',
  platform: 'ios',
  modName: 'entitlements',
  async readAsync(config, props) {
    let filePath = '';
    try {
      filePath = getEntitlementsPath(config.modRequest.projectRoot);
    } catch (error) {
      // Skip missing file errors in dry run mode since we don't write anywhere.
      if (!props.noPersist) throw error;
    }
    let data: InfoPlist = {};
    try {
      const contents = await readFile(filePath, 'utf8');
      assert(contents, 'Entitlements plist is empty');
      data = plist.parse(contents);
    } catch (error) {
      if (!props.noPersist) throw error;
      // If the file is invalid or doesn't exist, fallback on a default object (matching our template).
      data = {
        // always enable notifications by default.
        'aps-environment': 'development',
      };
    }

    // Apply all of the .entitlements values to the expo.ios.entitlements object
    // TODO: Remove this in favor of just overwriting the .entitlements with the Expo object. This will enable people to actually remove values.
    if (!config.ios) {
      config.ios = {};
    }
    if (!config.ios.entitlements) {
      config.ios.entitlements = {};
    }

    config.ios.entitlements = {
      ...(data || {}),
      ...config.ios.entitlements,
    };

    return { filePath, contents: data };
  },
  async writeAsync(filePath, config, props) {
    // Update the contents of the static infoPlist object
    if (!config.ios) {
      config.ios = {};
    }
    config.ios.entitlements = config.modResults;

    if (!props.noPersist) {
      await writeFile(filePath, plist.build(config.modResults));
    }
  },
});
