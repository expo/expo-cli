import { JSONObject } from '@expo/json-file';
import { IosPlist } from '@expo/xdl';
import { writeFile } from 'fs-extra';
import path from 'path';
import { XcodeProject } from 'xcode';

import {
  ConfigPlugin,
  ExpoConfig,
  ExportedConfig,
  IOSPluginModifierProps,
  PluginPlatform,
} from '../Config.types';
import * as WarningAggregator from '../WarningAggregator';
import { InfoPlist } from '../ios';
import { getEntitlementsPath } from '../ios/Entitlements';
import { getPbxproj, getProjectName } from '../ios/utils/Xcodeproj';
import { ensureArray, withAsyncDataProvider } from './core-plugins';

export async function compilePluginsAsync(projectRoot: string, config: ExportedConfig) {
  config = applyIOSDataProviders(projectRoot, config);
  config = applyAndroidDataProviders(projectRoot, config);

  return await evalPluginsAsync(config, { projectRoot });
}

function applyAndroidDataProviders(projectRoot: string, config: ExportedConfig): ExportedConfig {
  // TODO: Support android plugins
  return config;
}

function applyIOSDataProviders(projectRoot: string, config: ExportedConfig): ExportedConfig {
  const { iosProjectDirectory, entitlementsPath, supportingDirectory } = getIOSPaths(
    projectRoot,
    config.expo
  );

  // Append a rule to supply Info.plist data to plugins on `plugins.ios.infoPlist`
  config = withAsyncDataProvider<IOSPluginModifierProps<InfoPlist>>(config, {
    platform: 'ios',
    modifier: 'infoPlist',
    async action(config, { nextAction, ...props }) {
      let results: [ExportedConfig, IOSPluginModifierProps<JSONObject>] = [config, props];
      await IosPlist.modifyAsync(iosProjectDirectory, 'Info', async data => {
        results = await nextAction(config, {
          ...props,
          data,
        });
        return results[1].data;
      });
      await IosPlist.cleanBackupAsync(iosProjectDirectory, 'Info', false);
      return results;
    },
  });

  // Append a rule to supply Expo.plist data to plugins on `plugins.ios.expoPlist`
  config = withAsyncDataProvider<IOSPluginModifierProps<JSONObject>>(config, {
    platform: 'ios',
    modifier: 'expoPlist',
    async action(config, { nextAction, ...props }) {
      let results: [ExportedConfig, IOSPluginModifierProps<JSONObject>] = [config, props];
      try {
        await IosPlist.modifyAsync(iosProjectDirectory, 'Expo', async data => {
          results = await nextAction(config, {
            ...props,
            data,
          });
          return results[1].data;
        });
      } catch (error) {
        WarningAggregator.addWarningIOS(
          'updates',
          'Expo.plist configuration could not be applied. You will need to create Expo.plist if it does not exist and add Updates configuration manually.',
          'https://docs.expo.io/bare/updating-your-app/#configuration-options'
        );
      } finally {
        await IosPlist.cleanBackupAsync(supportingDirectory, 'Expo', false);
      }
      return results;
    },
  });

  // Append a rule to supply .entitlements data to plugins on `plugins.ios.entitlements`
  config = withAsyncDataProvider<IOSPluginModifierProps<JSONObject>>(config, {
    platform: 'ios',
    modifier: 'entitlements',
    async action(config, { nextAction, ...props }) {
      let results: [ExportedConfig, IOSPluginModifierProps<JSONObject>] = [config, props];

      const directory = path.dirname(entitlementsPath);
      const filename = path.basename(entitlementsPath, 'plist');

      try {
        await IosPlist.modifyAsync(directory, filename, async data => {
          results = await nextAction(config, {
            ...props,
            data,
          });
          return results[1].data;
        });
      } catch (error) {
        WarningAggregator.addWarningIOS(
          'entitlements',
          `${filename} configuration could not be applied.`
        );
      } finally {
        await IosPlist.cleanBackupAsync(directory, filename, false);
      }
      return results;
    },
  });

  // Append a rule to supply .xcodeproj data to plugins on `plugins.ios.xcodeproj`
  config = withAsyncDataProvider<IOSPluginModifierProps<XcodeProject>>(config, {
    platform: 'ios',
    modifier: 'xcodeproj',
    async action(config, { nextAction, ...props }) {
      const data = getPbxproj(projectRoot);
      const results = await nextAction(config, {
        ...props,
        data,
      });
      const resultData = results[1].data;
      await writeFile(resultData.filepath, resultData.writeSync());
      return results;
    },
  });

  return config;
}

/**
 * A generic plugin compiler.
 *
 * @param config
 */
export async function evalPluginsAsync(
  config: ExportedConfig,
  props: { projectRoot: string }
): Promise<ExportedConfig> {
  for (const [platformName, platform] of Object.entries(config.plugins ?? {})) {
    const platformProjectRoot = path.join(props.projectRoot, 'ios');
    const projectName = platformName === 'ios' ? getProjectName(props.projectRoot) : undefined;

    for (const [modifier, plugin] of Object.entries(platform)) {
      const results = await (plugin as ConfigPlugin<{
        projectRoot: string;
        platformProjectRoot: string;
        projectName?: string;
        modifier: string;
        platform: PluginPlatform;
      }>)(config, {
        ...props,
        projectName,
        platformProjectRoot,
        platform: platformName as PluginPlatform,
        modifier,
      });
      // If the results came from a modifier, they'd be in the form of [config, data].
      // Ensure the results are an array and omit the data since it should've been written by a data provider plugin.
      [config] = ensureArray(results);
    }
  }
  return config;
}

// TODO: come up with a better solution for using app.json expo.name in various places
function sanitizedName(name: string) {
  return name
    .replace(/[\W_]+/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// TODO: it's silly and kind of fragile that we look at app config to determine
// the ios project paths. Overall this function needs to be revamped, just a
// placeholder for now! Make this more robust when we support applying config
// at any time (currently it's only applied on eject).
function getIOSPaths(projectRoot: string, exp: ExpoConfig) {
  let projectName: string | null = null;

  // Attempt to get the current ios folder name (apply).
  try {
    projectName = getProjectName(projectRoot);
  } catch {
    // If no iOS project exists then create a new one (eject).
    projectName = exp.name;
    if (!projectName) {
      throw new Error('Your project needs a name in app.json/app.config.js.');
    }
    projectName = sanitizedName(projectName);
  }

  const iosProjectDirectory = path.join(projectRoot, 'ios', projectName);
  const iconPath = path.join(iosProjectDirectory, 'Assets.xcassets', 'AppIcon.appiconset');
  const supportingDirectory = path.join(iosProjectDirectory, 'Supporting');
  const entitlementsPath = getEntitlementsPath(projectRoot);
  return {
    projectName,
    supportingDirectory,
    iosProjectDirectory,
    entitlementsPath,
    iconPath,
  };
}
