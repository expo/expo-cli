import { JSONObject } from '@expo/json-file';
import plist from '@expo/plist';
import assert from 'assert';
import { promises } from 'fs';
import path from 'path';
import { XcodeProject } from 'xcode';

import { ExportedConfig, ModConfig } from '../Plugin.types';
import { Entitlements, Paths, XcodeUtils } from '../ios';
import { InfoPlist } from '../ios/IosConfig.types';
import {
  CreateBaseModProps,
  createPlatformBaseMod,
  ForwardedBaseModOptions,
  provider,
} from './createBaseMod';

const { readFile, writeFile } = promises;

export function withIosBaseMods(
  config: ExportedConfig,
  props: ForwardedBaseModOptions = {}
): ExportedConfig {
  return Object.entries(IosBaseMods).reduce(
    (config, [modName, value]) =>
      createPlatformBaseMod({ platform: 'ios', modName, ...value })(config, props),
    config
  );
}

const IosBaseMods: Record<
  keyof Required<ModConfig>['ios'],
  Pick<CreateBaseModProps<any, any>, 'readAsync' | 'writeAsync'>
> = {
  dangerous: provider<unknown>({
    async readAsync() {
      return { filePath: '', contents: {} };
    },
    async writeAsync() {},
  }),
  // Append a rule to supply AppDelegate data to mods on `mods.ios.appDelegate`
  appDelegate: provider<Paths.AppDelegateProjectFile>({
    async readAsync({ modRequest: { projectRoot } }) {
      const modResults = await Paths.getAppDelegate(projectRoot);
      return { filePath: modResults.path, contents: modResults };
    },
    async writeAsync(filePath: string, { modResults: { contents } }) {
      await writeFile(filePath, contents);
    },
  }),
  // Append a rule to supply Expo.plist data to mods on `mods.ios.expoPlist`
  expoPlist: provider<JSONObject>({
    async readAsync({ modRequest: { platformProjectRoot, projectName } }) {
      const supportingDirectory = path.join(platformProjectRoot, projectName!, 'Supporting');
      const filePath = path.resolve(supportingDirectory, 'Expo.plist');
      const modResults = plist.parse(await readFile(filePath, 'utf8'));
      return { filePath, contents: modResults };
    },
    async writeAsync(filePath, { modResults }) {
      await writeFile(filePath, plist.build(modResults));
    },
  }),
  // Append a rule to supply .xcodeproj data to mods on `mods.ios.xcodeproj`
  xcodeproj: provider<XcodeProject>({
    async readAsync({ modRequest: { projectRoot } }) {
      const contents = XcodeUtils.getPbxproj(projectRoot);
      return { filePath: contents.filepath, contents };
    },
    async writeAsync(filePath, { modResults }) {
      await writeFile(filePath, modResults.writeSync());
    },
  }),
  // Append a rule to supply Info.plist data to mods on `mods.ios.infoPlist`
  infoPlist: provider<InfoPlist, ForwardedBaseModOptions & { noPersist?: boolean }>({
    async readAsync(config, props) {
      let filePath = '';
      try {
        filePath = Paths.getInfoPlistPath(config.modRequest.projectRoot);
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
  }),
  // Append a rule to supply .entitlements data to mods on `mods.ios.entitlements`
  entitlements: provider<JSONObject, ForwardedBaseModOptions & { noPersist?: boolean }>({
    async readAsync(config, props) {
      let filePath = '';
      try {
        filePath = Entitlements.getEntitlementsPath(config.modRequest.projectRoot);
      } catch (error) {
        // Skip missing file errors in dry run mode since we don't write anywhere.
        if (!props.noPersist) throw error;
      }
      let data: JSONObject = {};
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
  }),
};
