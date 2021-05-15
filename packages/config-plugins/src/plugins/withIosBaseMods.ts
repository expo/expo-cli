import { JSONObject } from '@expo/json-file';
import plist from '@expo/plist';
import assert from 'assert';
import { promises } from 'fs';
import path from 'path';
import xcode, { XcodeProject } from 'xcode';

import { ExportedConfig, ModConfig } from '../Plugin.types';
import { Entitlements, Paths } from '../ios';
import { InfoPlist } from '../ios/IosConfig.types';
import { ForwardedBaseModOptions, provider, withGeneratedBaseMods } from './createBaseMod';

const { readFile, writeFile } = promises;

type IosModName = keyof Required<ModConfig>['ios'];

const providers = {
  dangerous: provider<unknown>({
    getFilePathAsync() {
      return '';
    },
    async readAsync() {
      return {};
    },
    async writeAsync() {},
  }),
  // Append a rule to supply AppDelegate data to mods on `mods.ios.appDelegate`
  appDelegate: provider<Paths.AppDelegateProjectFile>({
    getFilePathAsync({ modRequest: { projectRoot } }) {
      return Paths.getAppDelegateFilePath(projectRoot);
    },
    async readAsync(filePath) {
      return Paths.getFileInfo(filePath);
    },
    async writeAsync(filePath: string, { modResults: { contents } }) {
      await writeFile(filePath, contents);
    },
  }),
  // Append a rule to supply Expo.plist data to mods on `mods.ios.expoPlist`
  expoPlist: provider<JSONObject>({
    getFilePathAsync({ modRequest: { platformProjectRoot, projectName } }) {
      const supportingDirectory = path.join(platformProjectRoot, projectName!, 'Supporting');
      return path.resolve(supportingDirectory, 'Expo.plist');
    },
    async readAsync(filePath) {
      return plist.parse(await readFile(filePath, 'utf8'));
    },
    async writeAsync(filePath, { modResults }) {
      await writeFile(filePath, plist.build(modResults));
    },
  }),
  // Append a rule to supply .xcodeproj data to mods on `mods.ios.xcodeproj`
  xcodeproj: provider<XcodeProject>({
    getFilePathAsync({ modRequest: { projectRoot } }) {
      return Paths.getPBXProjectPath(projectRoot);
    },
    async readAsync(filePath) {
      const project = xcode.project(filePath);
      project.parseSync();
      return project;
    },
    async writeAsync(filePath, { modResults }) {
      await writeFile(filePath, modResults.writeSync());
    },
  }),
  // Append a rule to supply Info.plist data to mods on `mods.ios.infoPlist`
  infoPlist: provider<InfoPlist, ForwardedBaseModOptions & { noPersist?: boolean }>({
    getFilePathAsync(config) {
      return Paths.getInfoPlistPath(config.modRequest.projectRoot);
    },
    async readAsync(filePath, config) {
      // Apply all of the Info.plist values to the expo.ios.infoPlist object
      // TODO: Remove this in favor of just overwriting the Info.plist with the Expo object. This will enable people to actually remove values.
      if (!config.ios) {
        config.ios = {};
      }
      if (!config.ios.infoPlist) {
        config.ios.infoPlist = {};
      }

      const contents = await readFile(filePath, 'utf8');
      assert(contents, 'Info.plist is empty');
      const modResults = plist.parse(contents) as InfoPlist;

      config.ios.infoPlist = {
        ...(modResults || {}),
        ...config.ios.infoPlist,
      };

      return modResults;
    },
    async writeAsync(filePath, config) {
      // Update the contents of the static infoPlist object
      if (!config.ios) {
        config.ios = {};
      }
      config.ios.infoPlist = config.modResults;

      await writeFile(filePath, plist.build(config.modResults));
    },
  }),
  // Append a rule to supply .entitlements data to mods on `mods.ios.entitlements`
  entitlements: provider<JSONObject, ForwardedBaseModOptions & { noPersist?: boolean }>({
    getFilePathAsync(config) {
      return Entitlements.getEntitlementsPath(config.modRequest.projectRoot);
    },
    async readAsync(filePath, config) {
      const contents = await readFile(filePath, 'utf8');
      assert(contents, 'Entitlements plist is empty');
      const modResults = plist.parse(contents);

      // Apply all of the .entitlements values to the expo.ios.entitlements object
      // TODO: Remove this in favor of just overwriting the .entitlements with the Expo object. This will enable people to actually remove values.
      if (!config.ios) {
        config.ios = {};
      }
      if (!config.ios.entitlements) {
        config.ios.entitlements = {};
      }

      config.ios.entitlements = {
        ...(modResults || {}),
        ...config.ios.entitlements,
      };

      return modResults;
    },
    async writeAsync(filePath, config) {
      // Update the contents of the static infoPlist object
      if (!config.ios) {
        config.ios = {};
      }
      config.ios.entitlements = config.modResults;

      await writeFile(filePath, plist.build(config.modResults));
    },
  }),
};

export function withIosBaseMods(
  config: ExportedConfig,
  { enabled, ...props }: ForwardedBaseModOptions & { enabled?: Partial<typeof providers> } = {}
): ExportedConfig {
  return withGeneratedBaseMods<IosModName>(config, {
    ...props,
    platform: 'ios',
    providers: enabled ?? getIosModFileProviders(),
  });
}

export function getIosModFileProviders() {
  return providers;
}
