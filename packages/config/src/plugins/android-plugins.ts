import { ConfigPlugin, Mod } from '../Plugin.types';
import { AndroidManifest } from '../android/Manifest';
import { ResourceXML } from '../android/Resources';
import { withExtendedMod } from './core-plugins';

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
