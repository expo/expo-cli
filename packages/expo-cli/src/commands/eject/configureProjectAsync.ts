import { UserManager } from '@expo/api';
import { ExpoConfig, getConfig, ProjectConfig } from '@expo/config';
import {
  compileModsAsync,
  ConfigPlugin,
  ModPlatform,
  StaticPlugin,
  withExpoAndroidPlugins,
  withExpoIOSPlugins,
  withExpoVersionedSDKPlugins,
  withStaticPlugin,
} from '@expo/config-plugins';
import util from 'util';

import Log from '../../log';
import { getOrPromptForBundleIdentifier, getOrPromptForPackage } from './ConfigValidation';

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
  'expo-ads-facebook',
  'expo-location',
  'expo-media-library',
  // 'expo-notifications',
  'expo-screen-orientation',
  'expo-sensors',
  'expo-task-manager',
  'expo-local-authentication',
];

// Plugins that need to be automatically applied, but also get applied by expo-cli if the versioned plugin isn't available.
// These are split up because the user doesn't need to be prompted to setup these packages.
const expoManagedVersionedPlugins = [
  // 'expo-splash-screen',
  // 'expo-facebook',
  // 'expo-branch',
  // 'expo-updates',
  // 'expo-ads-admob',
  'expo-apple-authentication',
  'expo-document-picker',
  'expo-firebase-analytics',
  'expo-firebase-core',
  'expo-google-sign-in',
  // 'expo-dev-menu',
  // 'expo-dev-launcher',
];

const withOptionalPlugins: ConfigPlugin<(StaticPlugin | string)[]> = (config, plugins) => {
  return plugins.reduce((prev, plugin) => {
    return withStaticPlugin(prev, {
      // hide errors
      _isLegacyPlugin: true,
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

export async function getModdedConfigAsync({
  projectRoot,
  platforms,
  bundleIdentifier,
  packageName,
}: {
  projectRoot: string;
  bundleIdentifier?: string;
  packageName?: string;
  platforms: ModPlatform[];
}) {
  // let config: ExpoConfig;
  let { exp: config, ...rest } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
    isModdedConfig: true,
  });

  const expoUsername =
    process.env.EAS_BUILD_USERNAME || (await UserManager.getCurrentUsernameAsync());
  // Add all built-in plugins first because they should take
  // priority over the unversioned plugins.
  config = withExpoVersionedSDKPlugins(config, { expoUsername });
  config = withManagedPlugins(config);

  if (platforms.includes('ios')) {
    config.ios!.bundleIdentifier =
      bundleIdentifier ?? config.ios!.bundleIdentifier ?? 'UNDEFINED (invalid)';

    // Add all built-in plugins
    config = withExpoIOSPlugins(config, {
      bundleIdentifier: config.ios!.bundleIdentifier,
    });
  }

  if (platforms.includes('android')) {
    config.android!.package = packageName ?? config.android?.package ?? 'UNDEFINED (invalid)';

    // Add all built-in plugins
    config = withExpoAndroidPlugins(config, {
      package: config.android!.package,
    });
  }

  return { exp: config, ...rest };
}

export function logConfig(config: ExpoConfig | ProjectConfig) {
  const isObjStr = (str: string): boolean => /^\w+: {/g.test(str);
  Log.log(
    util.inspect(config, {
      colors: true,
      compact: false,
      // Sort objects to the end so that smaller values aren't hidden between large objects.
      sorted(a: string, b: string) {
        if (isObjStr(a)) return 1;
        if (isObjStr(b)) return -1;
        return 0;
      },
      showHidden: false,
      depth: null,
    })
  );
}

export default async function configureManagedProjectAsync({
  projectRoot,
  platforms,
}: {
  projectRoot: string;
  platforms: ModPlatform[];
}) {
  let bundleIdentifier: string | undefined;
  if (platforms.includes('ios')) {
    // Check bundle ID before reading the config because it may mutate the config if the user is prompted to define it.
    bundleIdentifier = await getOrPromptForBundleIdentifier(projectRoot);
  }
  let packageName: string | undefined;
  if (platforms.includes('android')) {
    // Check package before reading the config because it may mutate the config if the user is prompted to define it.
    packageName = await getOrPromptForPackage(projectRoot);
  }

  let { exp: config } = await getModdedConfigAsync({
    projectRoot,
    platforms,
    packageName,
    bundleIdentifier,
  });

  // compile all plugins and mods
  config = await compileModsAsync(config, { projectRoot, platforms });

  if (Log.isDebug) {
    Log.debug();
    Log.debug('Evaluated config:');
    logConfig(config);
    Log.debug();
  }

  return config;
}
