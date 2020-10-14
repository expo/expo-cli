import { JSONObject } from '@expo/json-file';
import { IosPlist } from '@expo/xdl';
import { writeFile } from 'fs-extra';
import path from 'path';
import { XcodeProject } from 'xcode';

import {
  ConfigModifierPlugin,
  ExpoConfig,
  ExportedConfig,
  IOSPluginModifierProps,
  PluginConfig,
  PluginPlatform,
} from '../Config.types';
import * as WarningAggregator from '../WarningAggregator';
import { InfoPlist } from '../ios';
import { getEntitlementsPath } from '../ios/Entitlements';
import { getPbxproj, getProjectName } from '../ios/utils/Xcodeproj';
import { ensureArray, withInterceptedModifier } from './core-plugins';

export async function compilePluginsAsync(projectRoot: string, config: ExportedConfig) {
  config = applyIOSCoreModifiers(projectRoot, config);
  config = applyAndroidCoreModifiers(projectRoot, config);

  return await evalPluginsAsync(config, { projectRoot });
}

function resolveModifierResults(results: any, platformName: string, modifierName: string) {
  // If the results came from a modifier, they'd be in the form of [config, data].
  // Ensure the results are an array and omit the data since it should've been written by a data provider plugin.
  const ensuredResults = ensureArray(results)[0] as any;

  // Sanity check to help locate non compliant modifiers.
  if (!ensuredResults?.expo || !ensuredResults?.plugins) {
    throw new Error(
      `Modifier \`plugins.${platformName}.${modifierName}\` evaluated to an object that is not a valid project config. Instead got: ${JSON.stringify(
        ensuredResults
      )}`
    );
  }
  return ensuredResults;
}

function applyAndroidCoreModifiers(projectRoot: string, config: ExportedConfig): ExportedConfig {
  // TODO: Support android plugins
  return config;
}

function applyIOSCoreModifiers(projectRoot: string, config: ExportedConfig): ExportedConfig {
  const { iosProjectDirectory, entitlementsPath, supportingDirectory } = getIOSPaths(
    projectRoot,
    config.expo
  );

  // Append a rule to supply Info.plist data to plugins on `plugins.ios.infoPlist`
  config = withInterceptedModifier<IOSPluginModifierProps<InfoPlist>>(config, {
    platform: 'ios',
    modifier: 'infoPlist',
    async action(config, { nextModifier, ...props }) {
      let results: [ExportedConfig, IOSPluginModifierProps<JSONObject>] = [config, props];
      await IosPlist.modifyAsync(iosProjectDirectory, 'Info', async data => {
        // Apply all of the Info.plist values to the expo.ios.infoPlist object
        // TODO: Remove this in favor of just overwriting the Info.plist with the Expo object. This will enable people to actually remove values.
        if (!config.expo.ios) {
          config.expo.ios = {};
        }
        if (!config.expo.ios.infoPlist) {
          config.expo.ios.infoPlist = {};
        }

        config.expo.ios.infoPlist = {
          ...(data || {}),
          ...config.expo.ios.infoPlist,
        };

        results = await nextModifier(config, {
          ...props,
          data: config.expo.ios.infoPlist as InfoPlist,
        });
        resolveModifierResults(results, props.platform, props.modifier);
        return results[1].data;
      });
      await IosPlist.cleanBackupAsync(iosProjectDirectory, 'Info', false);
      return results;
    },
  });

  // Append a rule to supply Expo.plist data to plugins on `plugins.ios.expoPlist`
  config = withInterceptedModifier<IOSPluginModifierProps<JSONObject>>(config, {
    platform: 'ios',
    modifier: 'expoPlist',
    async action(config, { nextModifier, ...props }) {
      let results: [ExportedConfig, IOSPluginModifierProps<JSONObject>] = [config, props];
      try {
        await IosPlist.modifyAsync(supportingDirectory, 'Expo', async data => {
          results = await nextModifier(config, {
            ...props,
            data,
          });
          resolveModifierResults(results, props.platform, props.modifier);
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
  config = withInterceptedModifier<IOSPluginModifierProps<JSONObject>>(config, {
    platform: 'ios',
    modifier: 'entitlements',
    async action(config, { nextModifier, ...props }) {
      let results: [ExportedConfig, IOSPluginModifierProps<JSONObject>] = [config, props];

      const directory = path.dirname(entitlementsPath);
      const filename = path.basename(entitlementsPath, 'plist');

      try {
        await IosPlist.modifyAsync(directory, filename, async data => {
          // Apply all of the .entitlements values to the expo.ios.entitlements object
          // TODO: Remove this in favor of just overwriting the .entitlements with the Expo object. This will enable people to actually remove values.
          if (!config.expo.ios) {
            config.expo.ios = {};
          }
          if (!config.expo.ios.entitlements) {
            config.expo.ios.entitlements = {};
          }

          config.expo.ios.entitlements = {
            ...(data || {}),
            ...config.expo.ios.entitlements,
          };

          results = await nextModifier(config, {
            ...props,
            data: config.expo.ios.entitlements as JSONObject,
          });
          resolveModifierResults(results, props.platform, props.modifier);
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
  config = withInterceptedModifier<IOSPluginModifierProps<XcodeProject>>(config, {
    platform: 'ios',
    modifier: 'xcodeproj',
    async action(config, { nextModifier, ...props }) {
      const data = getPbxproj(projectRoot);
      const results = await nextModifier(config, {
        ...props,
        data,
      });
      resolveModifierResults(results, props.platform, props.modifier);
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
  for (const [platformName, platform] of Object.entries(config.plugins ?? ({} as PluginConfig))) {
    const platformProjectRoot = path.join(props.projectRoot, platformName);
    const projectName = platformName === 'ios' ? getProjectName(props.projectRoot) : undefined;

    for (const [modifier, plugin] of Object.entries(platform)) {
      const results = await (plugin as ConfigModifierPlugin<{
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

      // Sanity check to help locate non compliant modifiers.
      config = resolveModifierResults(results, platformName, modifier);
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
