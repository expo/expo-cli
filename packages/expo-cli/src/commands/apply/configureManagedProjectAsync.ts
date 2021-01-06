import { ConfigPlugin, ExpoConfig, getConfig } from '@expo/config';
import {
  compileModsAsync,
  ModPlatform,
  withExpoAndroidPlugins,
  withExpoIOSPlugins,
} from '@expo/config-plugins';
import { StaticPlugin } from '@expo/config/build/plugins/modulePluginResolver';
import { withStaticPlugin } from '@expo/config/build/plugins/withStaticPlugin';
import { UserManager } from '@expo/xdl';

import log from '../../log';
import { getOrPromptForBundleIdentifier, getOrPromptForPackage } from '../eject/ConfigValidation';

// Expo managed packages that require extra update.
// These get applied automatically to create parity with expo build in eas build.
export const expoManagedPlugins = [
  'expo-app-auth',
  'expo-av',
  'expo-background-fetch',
  'expo-barcode-scanner',
  'expo-brightness',
  'expo-calendar',
  'expo-camera',
  'expo-contacts',
  'expo-image-picker',
  'expo-file-system',
  'expo-location',
  'expo-media-library',
  'expo-notifications',
  'expo-screen-orientation',
  'expo-sensors',
  'expo-task-manager',
];

// Plugins that need to be automatically applied, but also get applied by expo-cli if the versioned plugin isn't available.
// These are split up because the user doesn't need to be prompted to setup these packages.
const expoManagedVersionedPlugins = [
  'expo-splash-screen',
  'expo-updates',
  'expo-facebook',
  'expo-ads-admob',
  'expo-apple-authentication',
  'expo-branch',
  'expo-dev-menu',
  'expo-dev-launcher',
  'expo-document-picker',
  'expo-firebase-analytics',
  'expo-firebase-core',
  'expo-google-sign-in',
  'expo-local-authentication',
];

const withOptionalPlugins: ConfigPlugin<(StaticPlugin | string)[]> = (config, plugins) => {
  return plugins.reduce((prev, plugin) => {
    return withStaticPlugin(prev, {
      plugin,
      // If a plugin doesn't exist, do nothing.
      fallback: config => config,
    });
  }, config);
};

function withManagedPlugins(config: ExpoConfig) {
  return withOptionalPlugins(config, [
    ...new Set(expoManagedVersionedPlugins.concat(expoManagedPlugins)),
  ]);
}

export default async function configureManagedProjectAsync({
  projectRoot,
  platforms,
}: {
  projectRoot: string;
  platforms: ModPlatform[];
}) {
  // let config: ExpoConfig;
  let { exp: config } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
    isModdedConfig: true,
  });

  if (platforms.includes('ios')) {
    // Check bundle ID before reading the config because it may mutate the config if the user is prompted to define it.
    const bundleIdentifier = await getOrPromptForBundleIdentifier(projectRoot);
    config.ios!.bundleIdentifier = bundleIdentifier;
    const expoUsername =
      process.env.EAS_BUILD_USERNAME || (await UserManager.getCurrentUsernameAsync());

    // Add all built-in plugins
    config = withExpoIOSPlugins(config, {
      bundleIdentifier,
      expoUsername,
    });
  }

  if (platforms.includes('android')) {
    // Check package before reading the config because it may mutate the config if the user is prompted to define it.
    const packageName = await getOrPromptForPackage(projectRoot);
    config.android!.package = packageName;
    const expoUsername =
      process.env.EAS_BUILD_USERNAME || (await UserManager.getCurrentUsernameAsync());

    // Add all built-in plugins
    config = withExpoAndroidPlugins(config, {
      package: packageName,
      expoUsername,
    });
  }

  // Add all built-in plugins
  config = withManagedPlugins(config);

  // compile all plugins and mods
  config = await compileModsAsync(config, { projectRoot, platforms });

  if (log.isDebug) {
    log.debug();
    log.debug('Evaluated config:');
    // @ts-ignore: mods not on config type
    const { mods, ...rest } = config;
    log.info(JSON.stringify(rest, null, 2));
    log.info(mods);
    log.debug();
  }

  return config;
}
