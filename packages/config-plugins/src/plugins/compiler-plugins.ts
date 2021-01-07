import { JSONObject } from '@expo/json-file';
import plist from '@expo/plist';
import { readFile, writeFile } from 'fs-extra';
import path from 'path';
import { XcodeProject } from 'xcode';

import {
  ConfigPlugin,
  ExportedConfig,
  ExportedConfigWithProps,
  ModPlatform,
} from '../Plugin.types';
import { Manifest } from '../android';
import { AndroidManifest } from '../android/Manifest';
import * as AndroidPaths from '../android/Paths';
import { readResourcesXMLAsync, ResourceXML } from '../android/Resources';
import { getProjectStringsXMLPathAsync } from '../android/Strings';
import { writeXMLAsync } from '../android/XML';
import { getEntitlementsPath } from '../ios/Entitlements';
import { InfoPlist } from '../ios/IosConfig.types';
import { getInfoPlistPath, getPBXProjectPath } from '../ios/Paths';
import { readPbxproj } from '../ios/utils/Xcodeproj';
import { assert } from '../utils/errors';
import * as WarningAggregator from '../utils/warnings';
import { withInterceptedMod } from './core-plugins';

export function withBaseMods(config: ExportedConfig, options: FileModOptions): ExportedConfig {
  config = applyIOSBaseMods(config, options);
  config = applyAndroidBaseMods(config, options);
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

function applyAndroidBaseMods(config: ExportedConfig, options: FileModOptions): ExportedConfig {
  config = withExpoDangerousBaseMod(config, 'android');
  config = withAndroidStringsXMLBaseMod(config, options);
  config = withAndroidManifestBaseMod(config, options);
  config = withAndroidMainActivityBaseMod(config, options);
  config = withAndroidSettingsGradleBaseMod(config, options);
  config = withAndroidProjectBuildGradleBaseMod(config, options);
  config = withAndroidAppBuildGradleBaseMod(config, options);
  return config;
}

const withAndroidManifestBaseMod: ConfigPlugin<FileModOptions> = (config, { overwrite }) => {
  // Append a rule to supply AndroidManifest.xml data to mods on `mods.android.manifest`
  return withInterceptedMod<AndroidManifest>(config, {
    platform: 'android',
    mod: 'manifest',
    skipEmptyMod: !overwrite,
    async action({ modRequest: { nextMod, ...modRequest }, ...config }) {
      let results: ExportedConfigWithProps<AndroidManifest> = {
        ...config,
        modRequest,
      };

      try {
        const filePath = await AndroidPaths.getAndroidManifestAsync(modRequest.projectRoot);
        const inputFilePath = overwrite
          ? require.resolve('@expo/config-plugins/template/android/AndroidManifest.xml')
          : filePath;

        let modResults = await Manifest.readAndroidManifestAsync(inputFilePath);

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

const withAndroidStringsXMLBaseMod: ConfigPlugin<FileModOptions> = (config, { overwrite }) => {
  // Append a rule to supply strings.xml data to mods on `mods.android.strings`
  return withInterceptedMod<ResourceXML>(config, {
    platform: 'android',
    mod: 'strings',
    skipEmptyMod: !overwrite,
    async action({ modRequest: { nextMod, ...modRequest }, ...config }) {
      let results: ExportedConfigWithProps<ResourceXML> = {
        ...config,
        modRequest,
      };

      try {
        const filePath = await getProjectStringsXMLPathAsync(modRequest.projectRoot);
        const inputFilePath = overwrite
          ? require.resolve('@expo/config-plugins/template/android/strings.xml')
          : filePath;

        let modResults = await readResourcesXMLAsync({ path: inputFilePath });

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

const withAndroidProjectBuildGradleBaseMod: ConfigPlugin<FileModOptions> = (
  config,
  { overwrite }
) => {
  return withInterceptedMod<AndroidPaths.GradleProjectFile>(config, {
    platform: 'android',
    mod: 'projectBuildGradle',
    skipEmptyMod: !overwrite,
    async action({ modRequest: { nextMod, ...modRequest }, ...config }) {
      let results: ExportedConfigWithProps<AndroidPaths.GradleProjectFile> = {
        ...config,
        modRequest,
      };

      try {
        let modResults = await AndroidPaths.getProjectBuildGradleAsync(modRequest.projectRoot);
        if (overwrite) {
          modResults.contents = await readFile(
            require.resolve('@expo/config-plugins/template/android/project-build.gradle'),
            'utf8'
          );
        }
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

const withAndroidSettingsGradleBaseMod: ConfigPlugin<FileModOptions> = (config, { overwrite }) => {
  return withInterceptedMod<AndroidPaths.GradleProjectFile>(config, {
    platform: 'android',
    mod: 'settingsGradle',
    skipEmptyMod: !overwrite,
    async action({ modRequest: { nextMod, ...modRequest }, ...config }) {
      let results: ExportedConfigWithProps<AndroidPaths.GradleProjectFile> = {
        ...config,
        modRequest,
      };

      try {
        let modResults = await AndroidPaths.getSettingsGradleAsync(modRequest.projectRoot);
        if (overwrite) {
          modResults.contents = await readFile(
            require.resolve('@expo/config-plugins/template/android/settings.gradle'),
            'utf8'
          );
        }
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

const withAndroidAppBuildGradleBaseMod: ConfigPlugin<FileModOptions> = (config, { overwrite }) => {
  return withInterceptedMod<AndroidPaths.GradleProjectFile>(config, {
    platform: 'android',
    mod: 'appBuildGradle',
    skipEmptyMod: !overwrite,
    async action({ modRequest: { nextMod, ...modRequest }, ...config }) {
      let results: ExportedConfigWithProps<AndroidPaths.GradleProjectFile> = {
        ...config,
        modRequest,
      };

      try {
        let modResults = await AndroidPaths.getAppBuildGradleAsync(modRequest.projectRoot);
        if (overwrite) {
          modResults.contents = await readFile(
            require.resolve('@expo/config-plugins/template/android/app-build.gradle'),
            'utf8'
          );
        }

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

const withAndroidMainActivityBaseMod: ConfigPlugin<FileModOptions> = (config, { overwrite }) => {
  return withInterceptedMod<AndroidPaths.ApplicationProjectFile>(config, {
    platform: 'android',
    mod: 'mainActivity',
    skipEmptyMod: !overwrite,
    async action({ modRequest: { nextMod, ...modRequest }, ...config }) {
      let results: ExportedConfigWithProps<AndroidPaths.ApplicationProjectFile> = {
        ...config,
        modRequest,
      };

      try {
        let modResults = await AndroidPaths.getMainActivityAsync(modRequest.projectRoot);
        if (overwrite) {
          modResults.contents = await readFile(
            require.resolve('@expo/config-plugins/template/android/MainActivity.java'),
            'utf8'
          );
        }

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

type FileModOptions = { overwrite: boolean };

function applyIOSBaseMods(config: ExportedConfig, props: FileModOptions): ExportedConfig {
  // TODO: Use versioned files from remote template repo
  config = withExpoDangerousBaseMod(config, 'ios');
  config = withIosInfoPlistBaseMod(config, props);
  config = withExpoPlistBaseMod(config, props);
  config = withXcodeProjectBaseMod(config, props);
  config = withEntitlementsBaseMod(config, props);

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

const withExpoPlistBaseMod: ConfigPlugin<FileModOptions> = (config, { overwrite }) => {
  // Append a rule to supply Expo.plist data to mods on `mods.ios.expoPlist`
  return withInterceptedMod<JSONObject>(config, {
    platform: 'ios',
    mod: 'expoPlist',
    skipEmptyMod: !overwrite,
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
      const filePath = path.resolve(supportingDirectory, 'Expo.plist');
      const inputFilePath = overwrite
        ? require.resolve('@expo/config-plugins/template/ios/Expo.plist')
        : filePath;

      try {
        let modResults = plist.parse(await readFile(inputFilePath, 'utf8'));

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

const withXcodeProjectBaseMod: ConfigPlugin<FileModOptions> = (config, { overwrite }) => {
  // Append a rule to supply .xcodeproj data to mods on `mods.ios.xcodeproj`
  return withInterceptedMod<XcodeProject>(config, {
    platform: 'ios',
    mod: 'xcodeproj',
    skipEmptyMod: !overwrite,
    async action({ modRequest: { nextMod, ...modRequest }, ...config }) {
      const filePath = getPBXProjectPath(modRequest.projectRoot);
      const inputFilePath = overwrite
        ? require.resolve('@expo/config-plugins/template/ios/project.pbxproj')
        : filePath;
      const modResults = readPbxproj(inputFilePath);
      modResults.filepath = filePath;
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

const withIosInfoPlistBaseMod: ConfigPlugin<FileModOptions> = (config, { overwrite }) => {
  // Append a rule to supply Info.plist data to mods on `mods.ios.infoPlist`
  return withInterceptedMod<InfoPlist>(config, {
    platform: 'ios',
    mod: 'infoPlist',
    skipEmptyMod: !overwrite,
    async action({ modRequest: { nextMod, ...modRequest }, ...config }) {
      const filePath = getInfoPlistPath(modRequest.projectRoot);
      const inputFilePath = overwrite
        ? require.resolve('@expo/config-plugins/template/ios/Info.plist')
        : filePath;

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

      const contents = await readFile(inputFilePath, 'utf8');
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

const withEntitlementsBaseMod: ConfigPlugin<FileModOptions> = (config, { overwrite }) => {
  // Append a rule to supply .entitlements data to mods on `mods.ios.entitlements`
  return withInterceptedMod<JSONObject>(config, {
    platform: 'ios',
    mod: 'entitlements',
    skipEmptyMod: !overwrite,
    async action({ modRequest: { nextMod, ...modRequest }, ...config }) {
      const filePath = getEntitlementsPath(modRequest.projectRoot);
      const inputFilePath = overwrite
        ? require.resolve('@expo/config-plugins/template/ios/entitlements.plist')
        : filePath;

      let results: ExportedConfigWithProps<JSONObject> = {
        ...config,
        modRequest,
      };

      try {
        const data = plist.parse(await readFile(inputFilePath, 'utf8'));
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
        await writeFile(filePath, plist.build(results.modResults));
      } catch (error) {
        console.error(`${path.basename(filePath)} mod error:`);
        throw error;
      }
      return results;
    },
  });
};
