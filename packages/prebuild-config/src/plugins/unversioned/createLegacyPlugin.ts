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
    // Skip using the versioned plugin when autolinking is enabled
    // and doesn't link the native module.
    if (
      config._internal?.autolinkedModules &&
      !config._internal.autolinkedModules.includes(packageName)
    ) {
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
