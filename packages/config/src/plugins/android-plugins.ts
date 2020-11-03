import { ExpoConfig } from '@expo/config-types';

import { ConfigPlugin, Mod } from '../Plugin.types';
import { AndroidManifest } from '../android/Manifest';
import { ProjectFile } from '../android/Paths';
import { ResourceXML } from '../android/Resources';
import { withExtendedMod } from './core-plugins';

type OptionalPromise<T> = T | Promise<T>;

type MutateDataAction<T> = (expo: ExpoConfig, data: T) => OptionalPromise<T>;

/**
 * Helper method for creating mods from existing config functions.
 *
 * @param action
 */
export function createAndroidManifestPlugin(
  action: MutateDataAction<AndroidManifest>
): ConfigPlugin<void> {
  return config =>
    withAndroidManifest(config, async config => {
      config.modResults = await action(config, config.modResults);
      return config;
    });
}

export function createStringsXmlPlugin(action: MutateDataAction<ResourceXML>): ConfigPlugin<void> {
  return config =>
    withStringsXml(config, async config => {
      config.modResults = await action(config, config.modResults);
      return config;
    });
}

/**
 * Provides the AndroidManifest.xml for modification.
 *
 * @param config
 * @param action
 */
export const withAndroidManifest: ConfigPlugin<Mod<AndroidManifest>> = (config, action) => {
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
export const withStringsXml: ConfigPlugin<Mod<ResourceXML>> = (config, action) => {
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
export const withMainActivity: ConfigPlugin<Mod<ProjectFile<'java' | 'kt'>>> = (config, action) => {
  return withExtendedMod(config, {
    platform: 'android',
    mod: 'mainActivity',
    action,
  });
};

/**
 * Mods that don't modify any data, all unresolved functionality is performed inside a dangerous mod.
 *
 * @param config
 * @param action
 */
export const withDangerousAndroidMod: ConfigPlugin<Mod<unknown>> = (config, action) => {
  return withExtendedMod(config, {
    platform: 'ios',
    mod: 'dangerous',
    action,
  });
};
