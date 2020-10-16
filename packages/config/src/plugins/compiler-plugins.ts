import { ExpoConfig } from '@expo/config-types';
import { JSONObject } from '@expo/json-file';
import plist from '@expo/plist';
import { readFile, writeFile } from 'fs-extra';
import path from 'path';
import { XcodeProject } from 'xcode';

import {
  ConfigPlugin,
  ExportedConfig,
  ExportedConfigWithProps,
  ModifierPluginProps,
} from '../Plugin.types';
import { addWarningIOS } from '../WarningAggregator';
import { getEntitlementsPath } from '../ios/Entitlements';
import { InfoPlist } from '../ios/IosConfig.types';
import { getPbxproj, getProjectName } from '../ios/utils/Xcodeproj';
import { withInterceptedModifier } from './core-plugins';

export function withCoreModifiers(config: ExportedConfig, projectRoot: string): ExportedConfig {
  config = applyIOSCoreModifiers(projectRoot, config);
  config = applyAndroidCoreModifiers(projectRoot, config);
  return config;
}

export function resolveModifierResults(results: any, platformName: string, modifierName: string) {
  // If the results came from a modifier, they'd be in the form of [config, data].
  // Ensure the results are an array and omit the data since it should've been written by a data provider plugin.
  const ensuredResults = results;

  // Sanity check to help locate non compliant modifiers.
  if (!ensuredResults?.expo || !ensuredResults?.modifiers) {
    throw new Error(
      `Modifier \`modifiers.${platformName}.${modifierName}\` evaluated to an object that is not a valid project config. Instead got: ${JSON.stringify(
        ensuredResults
      )}`
    );
  }
  return ensuredResults;
}

function applyAndroidCoreModifiers(projectRoot: string, config: ExportedConfig): ExportedConfig {
  // TODO: Support android modifiers
  return config;
}

function applyIOSCoreModifiers(projectRoot: string, config: ExportedConfig): ExportedConfig {
  const { iosProjectDirectory, supportingDirectory } = getIOSPaths(projectRoot, config.expo);

  // Append a rule to supply Info.plist data to modifiers on `modifiers.ios.infoPlist`
  config = withInterceptedModifier<ModifierPluginProps<InfoPlist>>(config, {
    platform: 'ios',
    modifier: 'infoPlist',
    async action({ props: { nextModifier, ...props }, ...config }) {
      let results: ExportedConfigWithProps<ModifierPluginProps<JSONObject>> = {
        ...config,
        props,
      };

      // Apply all of the Info.plist values to the expo.ios.infoPlist object
      // TODO: Remove this in favor of just overwriting the Info.plist with the Expo object. This will enable people to actually remove values.
      if (!config.expo.ios) {
        config.expo.ios = {};
      }
      if (!config.expo.ios.infoPlist) {
        config.expo.ios.infoPlist = {};
      }

      const filePath = path.resolve(iosProjectDirectory, 'Info.plist');
      let data = plist.parse(await readFile(filePath, 'utf8'));

      config.expo.ios.infoPlist = {
        ...(data || {}),
        ...config.expo.ios.infoPlist,
      };

      results = await nextModifier({
        ...config,
        props: {
          ...props,
          data: config.expo.ios.infoPlist as InfoPlist,
        },
      });
      resolveModifierResults(results, props.platform, props.modifier);
      data = results.props.data;

      await writeFile(filePath, plist.build(data));

      return results;
    },
  });

  // Append a rule to supply Expo.plist data to modifiers on `modifiers.ios.expoPlist`
  config = withInterceptedModifier<ModifierPluginProps<JSONObject>>(config, {
    platform: 'ios',
    modifier: 'expoPlist',
    async action({ props: { nextModifier, ...props }, ...config }) {
      let results: ExportedConfigWithProps<ModifierPluginProps<JSONObject>> = {
        ...config,
        props,
      };

      try {
        const filePath = path.resolve(supportingDirectory, 'Expo.plist');
        let data = plist.parse(await readFile(filePath, 'utf8'));

        results = await nextModifier({
          ...config,
          props: {
            ...props,
            data,
          },
        });
        resolveModifierResults(results, props.platform, props.modifier);
        data = results.props.data;

        await writeFile(filePath, plist.build(data));
      } catch (error) {
        addWarningIOS(
          'updates',
          'Expo.plist configuration could not be applied. You will need to create Expo.plist if it does not exist and add Updates configuration manually.',
          'https://docs.expo.io/bare/updating-your-app/#configuration-options'
        );
      }
      return results;
    },
  });

  // Append a rule to supply .xcodeproj data to modifiers on `modifiers.ios.xcodeproj`
  config = withInterceptedModifier<ModifierPluginProps<XcodeProject>>(config, {
    platform: 'ios',
    modifier: 'xcodeproj',
    async action({ props: { nextModifier, ...props }, ...config }) {
      const data = getPbxproj(projectRoot);
      const results = await nextModifier({
        ...config,
        props: {
          ...props,
          data,
        },
      });
      resolveModifierResults(results, props.platform, props.modifier);
      const resultData = results.props.data;
      await writeFile(resultData.filepath, resultData.writeSync());
      return results;
    },
  });

  config = withEntitlementsBaseModifier(config, {});

  return config;
}

const withEntitlementsBaseModifier: ConfigPlugin = config => {
  // Append a rule to supply .entitlements data to modifiers on `modifiers.ios.entitlements`
  return withInterceptedModifier<ModifierPluginProps<JSONObject>>(config, {
    platform: 'ios',
    modifier: 'entitlements',
    async action({ props: { nextModifier, ...props }, ...config }) {
      const entitlementsPath = getEntitlementsPath(props.projectRoot);

      let results: ExportedConfigWithProps<ModifierPluginProps<JSONObject>> = {
        ...config,
        props,
      };

      try {
        const data = plist.parse(await readFile(entitlementsPath, 'utf8'));
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

        results = await nextModifier({
          ...config,
          props: {
            ...props,
            data: config.expo.ios.entitlements as JSONObject,
          },
        });
        resolveModifierResults(results, props.platform, props.modifier);
        await writeFile(entitlementsPath, plist.build(results.props.data));
      } catch (error) {
        addWarningIOS('entitlements', `${entitlementsPath} configuration could not be applied.`);
      }
      return results;
    },
  });
};

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
  return {
    projectName,
    supportingDirectory,
    iosProjectDirectory,
    iconPath,
  };
}
