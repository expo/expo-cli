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
import { BaseModOptions, withBaseMod } from './core-plugins';

type ForwardedBaseModOptions = Partial<Pick<BaseModOptions, 'saveToInternal' | 'skipEmptyMod'>>;

export function createBaseMod<
  ModType,
  Props extends ForwardedBaseModOptions = ForwardedBaseModOptions
>({
  methodName,
  platform,
  modName,
  readContentsAsync,
  writeContentsAsync,
}: {
  methodName: string;
  platform: ModPlatform;
  modName: string;
  readContentsAsync: (
    modRequest: ExportedConfigWithProps<ModType>,
    props: Props
  ) => Promise<{ contents: ModType; filePath: string }>;
  writeContentsAsync: (
    filePath: string,
    config: ExportedConfigWithProps<ModType>,
    props: Props
  ) => Promise<void>;
}): ConfigPlugin<Props | void> {
  const withUnknown: ConfigPlugin<Props | void> = (config, _props) => {
    const props = _props || ({} as Props);
    return withBaseMod<ModType>(config, {
      platform,
      mod: modName,
      skipEmptyMod: props.skipEmptyMod ?? true,
      saveToInternal: props.saveToInternal ?? false,
      async action({ modRequest: { nextMod, ...modRequest }, ...config }) {
        try {
          let results: ExportedConfigWithProps<ModType> = {
            ...config,
            modRequest,
          };

          const { contents: modResults, filePath } = await readContentsAsync(results, props);

          results = await nextMod!({
            ...config,
            modResults,
            modRequest,
          });

          resolveModResults(results, modRequest.platform, modRequest.modName);

          await writeContentsAsync(filePath, results, props);
          return results;
        } catch (error) {
          console.error(`[${platform}.${modName}]: ${methodName} error:`);
          throw error;
        }
      },
    });
  };

  if (methodName) {
    Object.defineProperty(withUnknown, 'name', {
      value: methodName,
    });
  }

  return withUnknown;
}

export function withBaseMods(config: ExportedConfig): ExportedConfig {
  config = withIOSBaseMods(config);
  config = withAndroidBaseMods(config);
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

function withAndroidBaseMods(config: ExportedConfig): ExportedConfig {
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

// Append a rule to supply gradle.properties data to mods on `mods.android.gradleProperties`
export const withAndroidManifestBaseMod = createBaseMod<AndroidManifest>({
  methodName: 'withAndroidManifestBaseMod',
  platform: 'android',
  modName: 'manifest',
  async readContentsAsync({ modRequest: { projectRoot } }) {
    const filePath = await AndroidPaths.getAndroidManifestAsync(projectRoot);
    const contents = await Manifest.readAndroidManifestAsync(filePath);
    return { filePath, contents };
  },
  async writeContentsAsync(filePath, { modResults }) {
    await Manifest.writeAndroidManifestAsync(filePath, modResults);
  },
});

// Append a rule to supply gradle.properties data to mods on `mods.android.gradleProperties`
export const withAndroidGradlePropertiesBaseMod = createBaseMod<Properties.PropertiesItem[]>({
  methodName: 'withAndroidGradlePropertiesBaseMod',
  platform: 'android',
  modName: 'gradleProperties',
  async readContentsAsync({ modRequest: { platformProjectRoot } }) {
    const filePath = path.join(platformProjectRoot, 'gradle.properties');
    const contents = Properties.parsePropertiesFile(await readFile(filePath, 'utf8'));
    return { filePath, contents };
  },
  async writeContentsAsync(filePath, { modResults }) {
    await writeFile(filePath, Properties.propertiesListToString(modResults));
  },
});

// Append a rule to supply strings.xml data to mods on `mods.android.strings`
const withAndroidStringsXMLBaseMod = createBaseMod<ResourceXML>({
  methodName: 'withAndroidStringsXMLBaseMod',
  platform: 'android',
  modName: 'strings',
  async readContentsAsync({ modRequest: { projectRoot } }) {
    const filePath = await getProjectStringsXMLPathAsync(projectRoot);
    const contents = await readResourcesXMLAsync({ path: filePath });
    return { filePath, contents };
  },
  async writeContentsAsync(filePath, { modResults }) {
    await writeXMLAsync({ path: filePath, xml: modResults });
  },
});

const withAndroidProjectBuildGradleBaseMod = createBaseMod<AndroidPaths.GradleProjectFile>({
  methodName: 'withAndroidProjectBuildGradleBaseMod',
  platform: 'android',
  modName: 'projectBuildGradle',
  async readContentsAsync({ modRequest: { projectRoot } }) {
    const modResults = await AndroidPaths.getProjectBuildGradleAsync(projectRoot);
    return { filePath: modResults.path, contents: modResults };
  },
  async writeContentsAsync(filePath, { modResults: { contents } }) {
    await writeFile(filePath, contents);
  },
});

const withAndroidSettingsGradleBaseMod = createBaseMod<AndroidPaths.GradleProjectFile>({
  methodName: 'withAndroidSettingsGradleBaseMod',
  platform: 'android',
  modName: 'settingsGradle',
  async readContentsAsync({ modRequest: { projectRoot } }) {
    const modResults = await AndroidPaths.getSettingsGradleAsync(projectRoot);
    return { filePath: modResults.path, contents: modResults };
  },
  async writeContentsAsync(filePath, { modResults: { contents } }) {
    await writeFile(filePath, contents);
  },
});

const withAndroidAppBuildGradleBaseMod = createBaseMod<AndroidPaths.GradleProjectFile>({
  methodName: 'withAndroidAppBuildGradleBaseMod',
  platform: 'android',
  modName: 'appBuildGradle',
  async readContentsAsync({ modRequest: { projectRoot } }) {
    const modResults = await AndroidPaths.getAppBuildGradleAsync(projectRoot);
    return { filePath: modResults.path, contents: modResults };
  },
  async writeContentsAsync(filePath, { modResults: { contents } }) {
    await writeFile(filePath, contents);
  },
});

const withAndroidMainActivityBaseMod = createBaseMod<AndroidPaths.ApplicationProjectFile>({
  methodName: 'withAndroidMainActivityBaseMod',
  platform: 'android',
  modName: 'mainActivity',
  async readContentsAsync({ modRequest: { projectRoot } }) {
    const modResults = await AndroidPaths.getMainActivityAsync(projectRoot);
    return { filePath: modResults.path, contents: modResults };
  },
  async writeContentsAsync(filePath, { modResults: { contents } }) {
    await writeFile(filePath, contents);
  },
});

function withIOSBaseMods(config: ExportedConfig): ExportedConfig {
  config = withExpoDangerousBaseMod(config, 'ios');
  config = withIOSAppDelegateBaseMod(config);
  config = withIOSInfoPlistBaseMod(config);
  config = withIOSExpoPlistBaseMod(config);
  config = withIOSXcodeProjectBaseMod(config);
  config = withIOSEntitlementsPlistBaseMod(config);

  return config;
}

const withExpoDangerousBaseMod: ConfigPlugin<ModPlatform> = (config, platform) => {
  // Used for scheduling when dangerous mods run.
  return withBaseMod<JSONObject>(config, {
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

const withIOSAppDelegateBaseMod = createBaseMod<AppDelegateProjectFile>({
  methodName: 'withIOSAppDelegateBaseMod',
  platform: 'ios',
  modName: 'appDelegate',
  async readContentsAsync({ modRequest: { projectRoot } }) {
    const modResults = await getAppDelegate(projectRoot);
    return { filePath: modResults.path, contents: modResults };
  },
  async writeContentsAsync(filePath, { modResults: { contents } }) {
    await writeFile(filePath, contents);
  },
});

const withIOSExpoPlistBaseMod = createBaseMod<JSONObject>({
  methodName: 'withIOSExpoPlistBaseMod',
  platform: 'ios',
  modName: 'expoPlist',
  async readContentsAsync({ modRequest: { platformProjectRoot, projectName } }) {
    const supportingDirectory = path.join(platformProjectRoot, projectName!, 'Supporting');
    const filePath = path.resolve(supportingDirectory, 'Expo.plist');
    const modResults = plist.parse(await readFile(filePath, 'utf8'));
    return { filePath, contents: modResults };
  },
  async writeContentsAsync(filePath, { modResults }) {
    await writeFile(filePath, plist.build(modResults));
  },
});

// Append a rule to supply .xcodeproj data to mods on `mods.ios.xcodeproj`
const withIOSXcodeProjectBaseMod = createBaseMod<XcodeProject>({
  methodName: 'withIOSExpoPlistBaseMod',
  platform: 'ios',
  modName: 'xcodeproj',
  async readContentsAsync({ modRequest: { projectRoot } }) {
    const contents = getPbxproj(projectRoot);
    return { filePath: contents.filepath, contents };
  },
  async writeContentsAsync(filePath, { modResults }) {
    await writeFile(filePath, modResults.writeSync());
  },
});

// Append a rule to supply Info.plist data to mods on `mods.ios.infoPlist`
const withIOSInfoPlistBaseMod = createBaseMod<
  InfoPlist,
  ForwardedBaseModOptions & { noPersist?: boolean }
>({
  methodName: 'withIOSInfoPlistBaseMod',
  platform: 'ios',
  modName: 'infoPlist',
  async readContentsAsync(config, props) {
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
  async writeContentsAsync(filePath, config, props) {
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
  async readContentsAsync(config, props) {
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
  async writeContentsAsync(filePath, config, props) {
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
