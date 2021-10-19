import {
  ConfigPlugin,
  createRunOncePlugin,
  PluginParameters,
  StaticPlugin,
  withPlugins,
  withStaticPlugin,
} from '@expo/config-plugins';
import { ExpoConfig } from '@expo/config-types';

const camelize = (s: string) => s.replace(/-./g, x => x.toUpperCase()[1]);

export function shouldSkipAutoPlugin(config: ExpoConfig, plugin: StaticPlugin | string) {
  if (Array.isArray(config._internal?.autolinking)) {
    const pluginId = Array.isArray(plugin) ? plugin[0] : plugin;
    if (typeof pluginId === 'string') {
      const isIncluded = config._internal!.autolinking.includes(plugin);
      if (!isIncluded) {
        return true;
      }
    }
  }
  return false;
}

export function createLegacyPlugin({
  packageName,
  fallback,
}: {
  packageName: string;
  fallback: ConfigPlugin | PluginParameters<typeof withPlugins>;
}): ConfigPlugin {
  let withFallback: ConfigPlugin;

  if (Array.isArray(fallback)) {
    withFallback = config => withPlugins(config, fallback);
  } else {
    withFallback = fallback;
  }

  const withUnknown: ConfigPlugin = config => {
    // Skip when autolinking is enabled
    if (config._internal?.autolinking && !config._internal.autolinking.includes(packageName)) {
      return createRunOncePlugin(withFallback, packageName)(config);
    }

    return withStaticPlugin(config, {
      _isLegacyPlugin: true,
      plugin: packageName,
      // If the static plugin isn't found, use the unversioned one.
      fallback: createRunOncePlugin(withFallback, packageName),
    });
  };

  const methodName = camelize(`with-${packageName}`);

  if (methodName) {
    Object.defineProperty(withUnknown, 'name', {
      value: methodName,
    });
  }

  return withUnknown;
}
