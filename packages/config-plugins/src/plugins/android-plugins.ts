import { ExpoConfig } from '@expo/config-types';

import { ConfigPlugin, Mod } from '../Plugin.types';
import { Manifest, Paths, Properties, Resources } from '../android';
import { withExtendedMod } from './core-plugins';

type OptionalPromise<T> = T | Promise<T>;

type MutateDataAction<T> = (expo: ExpoConfig, data: T) => OptionalPromise<T>;

/**
 * Helper method for creating mods from existing config functions.
 *
 * @param action
 */
export function createAndroidManifestPlugin(
  action: MutateDataAction<Manifest.AndroidManifest>,
  name: string
): ConfigPlugin {
  const withUnknown: ConfigPlugin = config =>
    withAndroidManifest(config, async config => {
      config.modResults = await action(config, config.modResults);
      return config;
    });
  if (name) {
    Object.defineProperty(withUnknown, 'name', {
      value: name,
    });
  }
  return withUnknown;
}

export function createStringsXmlPlugin(
  action: MutateDataAction<Resources.ResourceXML>,
  name: string
): ConfigPlugin {
  const withUnknown: ConfigPlugin = config =>
    withStringsXml(config, async config => {
      config.modResults = await action(config, config.modResults);
      return config;
    });
  if (name) {
    Object.defineProperty(withUnknown, 'name', {
      value: name,
    });
  }
  return withUnknown;
}

/**
 * Provides the AndroidManifest.xml for modification.
 *
 * @param config
 * @param action
 */
export const withAndroidManifest: ConfigPlugin<Mod<Manifest.AndroidManifest>> = (
  config,
  action
) => {
  return withExtendedMod(config, {
    platform: 'android',
    mod: 'manifest',
    action,
  });
};

/**
 * Provides the strings.xml for modification.
 *
 * @param config
 * @param action
 */
export const withStringsXml: ConfigPlugin<Mod<Resources.ResourceXML>> = (config, action) => {
  return withExtendedMod(config, {
    platform: 'android',
    mod: 'strings',
    action,
  });
};

/**
 * Provides the project MainActivity for modification.
 *
 * @param config
 * @param action
 */
export const withMainActivity: ConfigPlugin<Mod<Paths.ApplicationProjectFile>> = (
  config,
  action
) => {
  return withExtendedMod(config, {
    platform: 'android',
    mod: 'mainActivity',
    action,
  });
};

/**
 * Provides the project /build.gradle for modification.
 *
 * @param config
 * @param action
 */
export const withProjectBuildGradle: ConfigPlugin<Mod<Paths.GradleProjectFile>> = (
  config,
  action
) => {
  return withExtendedMod(config, {
    platform: 'android',
    mod: 'projectBuildGradle',
    action,
  });
};

/**
 * Provides the app/build.gradle for modification.
 *
 * @param config
 * @param action
 */
export const withAppBuildGradle: ConfigPlugin<Mod<Paths.GradleProjectFile>> = (config, action) => {
  return withExtendedMod(config, {
    platform: 'android',
    mod: 'appBuildGradle',
    action,
  });
};

/**
 * Provides the /settings.gradle for modification.
 *
 * @param config
 * @param action
 */
export const withSettingsGradle: ConfigPlugin<Mod<Paths.GradleProjectFile>> = (config, action) => {
  return withExtendedMod(config, {
    platform: 'android',
    mod: 'settingsGradle',
    action,
  });
};

/**
 * Provides the /gradle.properties for modification.
 *
 * @param config
 * @param action
 */
export const withGradleProperties: ConfigPlugin<Mod<Properties.PropertiesItem[]>> = (
  config,
  action
) => {
  return withExtendedMod(config, {
    platform: 'android',
    mod: 'gradleProperties',
    action,
  });
};
