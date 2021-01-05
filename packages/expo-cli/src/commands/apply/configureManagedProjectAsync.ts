import { ConfigPlugin, ExpoConfig, getConfig } from '@expo/config';
import { compileModsAsync, ModPlatform } from '@expo/config-plugins';
import { StaticPlugin } from '@expo/config/build/plugins/modulePluginResolver';
import { withStaticPlugin } from '@expo/config/build/plugins/withStaticPlugin';

import log from '../../log';

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
  return withOptionalPlugins(config, expoManagedPlugins);
}

export default async function configureManagedProjectAsync({
  projectRoot,
  platforms,
}: {
  projectRoot: string;
  platforms: ModPlatform[];
}) {
  let { exp: config } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
    isModdedConfig: true,
  });

  // Add all built-in plugins
  config = withManagedPlugins(config);

  // compile all plugins and mods
  config = await compileModsAsync(config, { projectRoot, platforms });

  if (log.isDebug) {
    log.debug();
    log.debug('Evaluated Managed config:');
    // @ts-ignore: mods not on config type
    const { mods, ...rest } = config;
    log.info(JSON.stringify(rest, null, 2));
    log.info(mods);
    log.debug();
  }
  return config;
}
