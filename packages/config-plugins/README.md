# Expo Config Plugins

The Expo config is a powerful tool for generating native app code from a unified JavaScript interface. Most basic functionality can be controlled by using the the [static Expo config](https://docs.expo.dev/versions/latest/config/app/), but some features require manipulation of the native project files. To support complex behavior we've created config plugins, and mods (short for modifiers).

For more info, please refer to the official docs: [Config Plugins](https://docs.expo.dev/guides/config-plugins/).

## Environment Variables

### `EXPO_DEBUG`

Print debug information related to static plugin resolution.

### `EXPO_CONFIG_PLUGIN_VERBOSE_ERRORS`

Show all error info related to static plugin resolution. Requires `EXPO_DEBUG` to be enabled.

### `EXPO_USE_UNVERSIONED_PLUGINS`

Force using the fallback unversioned plugins instead of a local versioned copy from installed packages, this should only be used for testing the CLI.
