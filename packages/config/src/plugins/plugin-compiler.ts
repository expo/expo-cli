import { JSONObject } from '@expo/json-file';
import { IosPlist } from '@expo/xdl';
import { writeFile } from 'fs-extra';
import path from 'path';
import { XcodeProject } from 'xcode';

import { WarningAggregator } from '..';
import { getConfig } from '../Config';
import {
  ConfigPlugin,
  ExpoConfig,
  ExportedConfig,
  IOSPluginModifierProps,
  PluginPlatform,
} from '../Config.types';
import { InfoPlist } from '../ios';
import { getEntitlementsPath } from '../ios/Entitlements';
import { getPbxproj, getProjectName } from '../ios/utils/Xcodeproj';
import { ensureArray, withAsyncDataProvider } from './core-plugins';

export async function compilePluginsAsync(projectRoot: string, config: ExportedConfig) {
  // Check bundle ID before reading the config because it may mutate the config if the user is prompted to define it.
  //   let config = getExportedConfig(projectRoot);

  const { iosProjectDirectory } = getIOSPaths(projectRoot, config.expo);
  const supportingDirectory = path.join(iosProjectDirectory, 'Supporting');
  const entitlementsPath = getEntitlementsPath(projectRoot);

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

  return await evalPluginsAsync(config, { projectRoot });
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

// async function compileIOSPluginsAsync(
//   projectRoot: string,
//   { expo, plugins }: ExportedConfig
// ): Promise<void> {
//   const projectFileSystem = {
//     projectRoot,
//     platformProjectRoot: path.join(projectRoot, 'ios'),
//     projectName: getProjectName(projectRoot),
//   };

//   // Configure the Info.plist
//   await modifyInfoPlistAsync(projectRoot, async data => {
//     data =
//       expo.ios?.infoPlist || IOSConfig.CustomInfoPlistEntries.setCustomInfoPlistEntries(expo, data);
//     return data;
//   });

//   // Configure Expo.plist
//   await modifyExpoPlistAsync(projectRoot, async data => {
//     if (typeof plugins?.ios?.expoPlist === 'function') {
//       data = (
//         await plugins.ios.expoPlist({
//           ...projectFileSystem,
//           data,
//         })
//       ).data;
//     }
//     return data;
//   });

//   // TODO: fix this on Windows! We will ignore errors for now so people can just proceed
//   try {
//     // Configure entitlements/capabilities
//     await modifyEntitlementsPlistAsync(projectRoot, async data => {
//       if (typeof plugins?.ios?.entitlements === 'function') {
//         data = (
//           await plugins.ios.entitlements({
//             ...projectFileSystem,
//             data,
//           })
//         ).data;
//       }
//       return data;
//     });
//   } catch (e) {
//     WarningAggregator.addWarningIOS(
//       'entitlements',
//       'iOS entitlements could not be applied. Please ensure that contact notes, Apple Sign In, and associated domains entitlements are properly configured if you use them in your app.'
//     );
//   }

//   // Run all post plugins
//   await plugins?.ios?.file?.({
//     ...projectFileSystem,
//   });
// }

function getExportedConfig(projectRoot: string): ExportedConfig {
  const originalConfig = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  return { expo: originalConfig.exp, plugins: originalConfig.plugins };
}

// async function modifyEntitlementsPlistAsync(projectRoot: string, callback: (plist: any) => any) {
//   const entitlementsPath = IOSConfig.Entitlements.getEntitlementsPath(projectRoot);
//   const directory = path.dirname(entitlementsPath);
//   const filename = path.basename(entitlementsPath, 'plist');
//   await IosPlist.modifyAsync(directory, filename, callback);
//   await IosPlist.cleanBackupAsync(directory, filename, false);
// }

// async function modifyInfoPlistAsync(projectRoot: string, callback: (plist: any) => any) {
//   const { iosProjectDirectory } = getIOSPaths(projectRoot);
//   await IosPlist.modifyAsync(iosProjectDirectory, 'Info', callback);
//   await IosPlist.cleanBackupAsync(iosProjectDirectory, 'Info', false);
// }

// async function modifyExpoPlistAsync(projectRoot: string, callback: (plist: any) => any) {
//   const { iosProjectDirectory } = getIOSPaths(projectRoot);
//   const supportingDirectory = path.join(iosProjectDirectory, 'Supporting');
//   try {
//     await IosPlist.modifyAsync(supportingDirectory, 'Expo', callback);
//   } catch (error) {
//     WarningAggregator.addWarningIOS(
//       'updates',
//       'Expo.plist configuration could not be applied. You will need to create Expo.plist if it does not exist and add Updates configuration manually.',
//       'https://docs.expo.io/bare/updating-your-app/#configuration-options'
//     );
//   } finally {
//     await IosPlist.cleanBackupAsync(supportingDirectory, 'Expo', false);
//   }
// }

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

  return {
    projectName,
    iosProjectDirectory,
    iconPath,
  };
}
