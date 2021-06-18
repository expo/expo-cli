import {
  ConfigPlugin,
  createRunOncePlugin,
  PluginParameters,
  withPlugins,
  withStaticPlugin,
} from '@expo/config-plugins';

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
