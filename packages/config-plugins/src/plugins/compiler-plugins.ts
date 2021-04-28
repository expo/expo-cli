import { JSONObject } from '@expo/json-file';
import plist from '@expo/plist';
import assert from 'assert';
import { readFile, writeFile } from 'fs-extra';
import path from 'path';
import { XcodeProject } from 'xcode';

import {
  ConfigPlugin,
  ExportedConfig,
  ExportedConfigWithProps,
  ModPlatform,
} from '../Plugin.types';
import { Manifest, Properties } from '../android';
import { AndroidManifest } from '../android/Manifest';
import * as AndroidPaths from '../android/Paths';
import { readResourcesXMLAsync, ResourceXML } from '../android/Resources';
import { getProjectStringsXMLPathAsync } from '../android/Strings';
import { getEntitlementsPath } from '../ios/Entitlements';
import { InfoPlist } from '../ios/IosConfig.types';
import { AppDelegateProjectFile, getAppDelegate, getInfoPlistPath } from '../ios/Paths';
import { getPbxproj } from '../ios/utils/Xcodeproj';
import { writeXMLAsync } from '../utils/XML';
import * as WarningAggregator from '../utils/warnings';
import { withInterceptedMod } from './core-plugins';

export function withBaseMods(config: ExportedConfig): ExportedConfig {
  config = applyIOSBaseMods(config);
  config = applyAndroidBaseMods(config);
  return config;
}

export function resolveModResults(results: any, platformName: string, modName: string) {
  // If the results came from a mod, they'd be in the form of [config, data].
  // Ensure the results are an array and omit the data since it should've been written by a data provider plugin.
  const ensuredResults = results;

  // Sanity check to help locate non compliant mods.
  if (!ensuredResults || typeof ensuredResults !== 'object' || !ensuredResults?.mods) {
    throw new Error(
      `Mod \`mods.${platformName}.${modName}\` evaluated to an object that is not a valid project config. Instead got: ${JSON.stringify(
        ensuredResults
      )}`
    );
  }
  return ensuredResults;
}

function applyAndroidBaseMods(config: ExportedConfig): ExportedConfig {
  config = withExpoDangerousBaseMod(config, 'android');
  config = withAndroidStringsXMLBaseMod(config);
  config = withAndroidGradlePropertiesBaseMod(config);
  config = withAndroidManifestBaseMod(config);
  config = withAndroidMainActivityBaseMod(config);
  config = withAndroidSettingsGradleBaseMod(config);
  config = withAndroidProjectBuildGradleBaseMod(config);
  config = withAndroidAppBuildGradleBaseMod(config);
  return config;
}

const withAndroidManifestBaseMod: ConfigPlugin = config => {
  // Append a rule to supply AndroidManifest.xml data to mods on `mods.android.manifest`
  return withInterceptedMod<AndroidManifest>(config, {
    platform: 'android',
    mod: 'manifest',
    skipEmptyMod: true,
    async action({ modRequest: { nextMod, ...modRequest }, ...config }) {
      let results: ExportedConfigWithProps<AndroidManifest> = {
        ...config,
        modRequest,
      };

      try {
        const filePath = await AndroidPaths.getAndroidManifestAsync(modRequest.projectRoot);
        let modResults = await Manifest.readAndroidManifestAsync(filePath);

        results = await nextMod!({
          ...config,
          modResults,
          modRequest,
        });
        resolveModResults(results, modRequest.platform, modRequest.modName);
        modResults = results.modResults;

        await Manifest.writeAndroidManifestAsync(filePath, modResults);
      } catch (error) {
        console.error(`AndroidManifest.xml mod error:`);
        throw error;
      }
      return results;
    },
  });
};

export const withAndroidGradlePropertiesBaseMod: ConfigPlugin = config => {
  // Append a rule to supply gradle.properties data to mods on `mods.android.gradleProperties`
  return withInterceptedMod<Properties.PropertiesItem[]>(config, {
    platform: 'android',
    mod: 'gradleProperties',
    skipEmptyMod: true,
    async action({ modRequest: { nextMod, ...modRequest }, ...config }) {
      let results: ExportedConfigWithProps<Properties.PropertiesItem[]> = {
        ...config,
        modRequest,
      };

      try {
        const filePath = path.join(modRequest.platformProjectRoot, 'gradle.properties');
        const contents = await readFile(filePath, 'utf8');
        let modResults = Properties.parsePropertiesFile(contents);

        results = await nextMod!({
          ...config,
          modResults,
          modRequest,
        });
        resolveModResults(results, modRequest.platform, modRequest.modName);
        modResults = results.modResults;
        await writeFile(filePath, Properties.propertiesListToString(modResults), 'utf8');
      } catch (error) {
        console.error(`gradle.properties mod error:`);
        throw error;
      }
      return results;
    },
  });
};

const withAndroidStringsXMLBaseMod: ConfigPlugin = config => {
  // Append a rule to supply strings.xml data to mods on `mods.android.strings`
  return withInterceptedMod<ResourceXML>(config, {
    platform: 'android',
    mod: 'strings',
    skipEmptyMod: true,
    async action({ modRequest: { nextMod, ...modRequest }, ...config }) {
      let results: ExportedConfigWithProps<ResourceXML> = {
        ...config,
        modRequest,
      };

      try {
        const filePath = await getProjectStringsXMLPathAsync(modRequest.projectRoot);
        let modResults = await readResourcesXMLAsync({ path: filePath });

        results = await nextMod!({
          ...config,
          modResults,
          modRequest,
        });
        resolveModResults(results, modRequest.platform, modRequest.modName);
        modResults = results.modResults;

        await writeXMLAsync({ path: filePath, xml: modResults });
      } catch (error) {
        console.error(`strings.xml mod error:`);
        throw error;
      }
      return results;
    },
  });
};

const withAndroidProjectBuildGradleBaseMod: ConfigPlugin = config => {
  return withInterceptedMod<AndroidPaths.GradleProjectFile>(config, {
    platform: 'android',
    mod: 'projectBuildGradle',
    skipEmptyMod: true,
    async action({ modRequest: { nextMod, ...modRequest }, ...config }) {
      let results: ExportedConfigWithProps<AndroidPaths.GradleProjectFile> = {
        ...config,
        modRequest,
      };

      try {
        let modResults = await AndroidPaths.getProjectBuildGradleAsync(modRequest.projectRoot);
        // Currently don't support changing the path or language
        const filePath = modResults.path;

        results = await nextMod!({
          ...config,
          modResults,
          modRequest,
        });
        resolveModResults(results, modRequest.platform, modRequest.modName);
        modResults = results.modResults;

        await writeFile(filePath, modResults.contents);
      } catch (error) {
        console.error(`android/build.gradle mod error:`);
        throw error;
      }
      return results;
    },
  });
};

const withAndroidSettingsGradleBaseMod: ConfigPlugin = config => {
  return withInterceptedMod<AndroidPaths.GradleProjectFile>(config, {
    platform: 'android',
    mod: 'settingsGradle',
    skipEmptyMod: true,
    async action({ modRequest: { nextMod, ...modRequest }, ...config }) {
      let results: ExportedConfigWithProps<AndroidPaths.GradleProjectFile> = {
        ...config,
        modRequest,
      };

      try {
        let modResults = await AndroidPaths.getSettingsGradleAsync(modRequest.projectRoot);
        // Currently don't support changing the path or language
        const filePath = modResults.path;

        results = await nextMod!({
          ...config,
          modResults,
          modRequest,
        });
        resolveModResults(results, modRequest.platform, modRequest.modName);
        modResults = results.modResults;

        await writeFile(filePath, modResults.contents);
      } catch (error) {
        console.error(`android/settings.gradle mod error:`);
        throw error;
      }
      return results;
    },
  });
};

const withAndroidAppBuildGradleBaseMod: ConfigPlugin = config => {
  return withInterceptedMod<AndroidPaths.GradleProjectFile>(config, {
    platform: 'android',
    mod: 'appBuildGradle',
    skipEmptyMod: true,
    async action({ modRequest: { nextMod, ...modRequest }, ...config }) {
      let results: ExportedConfigWithProps<AndroidPaths.GradleProjectFile> = {
        ...config,
        modRequest,
      };

      try {
        let modResults = await AndroidPaths.getAppBuildGradleAsync(modRequest.projectRoot);
        // Currently don't support changing the path or language
        const filePath = modResults.path;

        results = await nextMod!({
          ...config,
          modResults,
          modRequest,
        });
        resolveModResults(results, modRequest.platform, modRequest.modName);
        modResults = results.modResults;

        await writeFile(filePath, modResults.contents);
      } catch (error) {
        console.error(`android/app/build.gradle mod error:`);
        throw error;
      }
      return results;
    },
  });
};

const withAndroidMainActivityBaseMod: ConfigPlugin = config => {
  return withInterceptedMod<AndroidPaths.ApplicationProjectFile>(config, {
    platform: 'android',
    mod: 'mainActivity',
    skipEmptyMod: true,
    async action({ modRequest: { nextMod, ...modRequest }, ...config }) {
      let results: ExportedConfigWithProps<AndroidPaths.ApplicationProjectFile> = {
        ...config,
        modRequest,
      };

      try {
        let modResults = await AndroidPaths.getMainActivityAsync(modRequest.projectRoot);
        // Currently don't support changing the path or language
        const filePath = modResults.path;

        results = await nextMod!({
          ...config,
          modResults,
          modRequest,
        });
        resolveModResults(results, modRequest.platform, modRequest.modName);
        modResults = results.modResults;

        await writeFile(filePath, modResults.contents);
      } catch (error) {
        console.error(`MainActivity mod error:`);
        throw error;
      }
      return results;
    },
  });
};

function applyIOSBaseMods(config: ExportedConfig): ExportedConfig {
  config = withExpoDangerousBaseMod(config, 'ios');
  config = withAppDelegateBaseMod(config);
  config = withIosInfoPlistBaseMod(config);
  config = withExpoPlistBaseMod(config);
  config = withXcodeProjectBaseMod(config);
  config = withEntitlementsBaseMod(config);

  return config;
}

const withExpoDangerousBaseMod: ConfigPlugin<ModPlatform> = (config, platform) => {
  // Used for scheduling when dangerous mods run.
  return withInterceptedMod<JSONObject>(config, {
    platform,
    mod: 'dangerous',
    skipEmptyMod: true,
    async action({ modRequest: { nextMod, ...modRequest }, ...config }) {
      const results = await nextMod!({
        ...config,
        modRequest,
      });
      resolveModResults(results, modRequest.platform, modRequest.modName);
      return results;
    },
  });
};

const withAppDelegateBaseMod: ConfigPlugin = config => {
  return withInterceptedMod<AppDelegateProjectFile>(config, {
    platform: 'ios',
    mod: 'appDelegate',
    skipEmptyMod: true,
    async action({ modRequest: { nextMod, ...modRequest }, ...config }) {
      let results: ExportedConfigWithProps<AppDelegateProjectFile> = {
        ...config,
        modRequest,
      };

      try {
        let modResults = getAppDelegate(modRequest.projectRoot);
        // Currently don't support changing the path or language
        const filePath = modResults.path;

        results = await nextMod!({
          ...config,
          modResults,
          modRequest,
        });
        resolveModResults(results, modRequest.platform, modRequest.modName);
        modResults = results.modResults;

        await writeFile(filePath, modResults.contents);
      } catch (error) {
        console.error(`AppDelegate mod error:`);
        throw error;
      }
      return results;
    },
  });
};

const withExpoPlistBaseMod: ConfigPlugin = config => {
  // Append a rule to supply Expo.plist data to mods on `mods.ios.expoPlist`
  return withInterceptedMod<JSONObject>(config, {
    platform: 'ios',
    mod: 'expoPlist',
    skipEmptyMod: false,
    async action({ modRequest: { nextMod, ...modRequest }, ...config }) {
      const supportingDirectory = path.join(
        modRequest.platformProjectRoot,
        modRequest.projectName!,
        'Supporting'
      );

      let results: ExportedConfigWithProps<JSONObject> = {
        ...config,
        modRequest,
      };
      try {
        const filePath = path.resolve(supportingDirectory, 'Expo.plist');
        // Start from scratch every time.
        let modResults = {};

        // TODO: Fix type
        results = await nextMod!({
          ...config,
          modResults,
          modRequest,
        });
        resolveModResults(results, modRequest.platform, modRequest.modName);
        modResults = results.modResults;

        await writeFile(filePath, plist.build(modResults));
      } catch (error) {
        WarningAggregator.addWarningIOS(
          'updates',
          'Expo.plist configuration could not be applied. You will need to create Expo.plist if it does not exist and add Updates configuration manually.',
          'https://docs.expo.io/bare/updating-your-app/#configuration-options'
        );
      }
      return results;
    },
  });
};

const withXcodeProjectBaseMod: ConfigPlugin = config => {
  // Append a rule to supply .xcodeproj data to mods on `mods.ios.xcodeproj`
  return withInterceptedMod<XcodeProject>(config, {
    platform: 'ios',
    mod: 'xcodeproj',
    skipEmptyMod: true,
    async action({ modRequest: { nextMod, ...modRequest }, ...config }) {
      const modResults = getPbxproj(modRequest.projectRoot);
      // TODO: Fix type
      const results = await nextMod!({
        ...config,
        modResults,
        modRequest,
      });
      resolveModResults(results, modRequest.platform, modRequest.modName);
      const resultData = results.modResults;
      await writeFile(resultData.filepath, resultData.writeSync());
      return results;
    },
  });
};

const withIosInfoPlistBaseMod: ConfigPlugin = config => {
  // Append a rule to supply Info.plist data to mods on `mods.ios.infoPlist`
  return withInterceptedMod<InfoPlist>(config, {
    platform: 'ios',
    mod: 'infoPlist',
    skipEmptyMod: true,
    async action({ modRequest: { nextMod, ...modRequest }, ...config }) {
      const filePath = getInfoPlistPath(modRequest.projectRoot);

      let results: ExportedConfigWithProps<JSONObject> = {
        ...config,
        modRequest,
      };

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
      let data = plist.parse(contents);

      config.ios.infoPlist = {
        ...(data || {}),
        ...config.ios.infoPlist,
      };
      // TODO: Fix type
      results = await nextMod!({
        ...config,
        modRequest,
        modResults: config.ios.infoPlist as InfoPlist,
      });
      resolveModResults(results, modRequest.platform, modRequest.modName);
      data = results.modResults;

      await writeFile(filePath, plist.build(data));

      return results;
    },
  });
};

const withEntitlementsBaseMod: ConfigPlugin = config => {
  // Append a rule to supply .entitlements data to mods on `mods.ios.entitlements`
  return withInterceptedMod<JSONObject>(config, {
    platform: 'ios',
    mod: 'entitlements',
    skipEmptyMod: true,
    async action({ modRequest: { nextMod, ...modRequest }, ...config }) {
      const entitlementsPath = getEntitlementsPath(modRequest.projectRoot);

      let results: ExportedConfigWithProps<JSONObject> = {
        ...config,
        modRequest,
      };

      try {
        const data = plist.parse(await readFile(entitlementsPath, 'utf8'));
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

        // TODO: Fix type
        results = await nextMod!({
          ...config,
          modRequest,
          modResults: config.ios.entitlements as JSONObject,
        });
        resolveModResults(results, modRequest.platform, modRequest.modName);
        await writeFile(entitlementsPath, plist.build(results.modResults));
      } catch (error) {
        console.error(`${path.basename(entitlementsPath)} mod error:`);
        throw error;
      }
      return results;
    },
  });
};
