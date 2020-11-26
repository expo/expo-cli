# Expo Config Plugins

The Expo config is a powerful tool for generating native app code from a unified JavaScript interface. Most basic functionality can be controlled by using the the [static Expo config](https://docs.expo.io/versions/latest/config/app/), but some features require manipulation of the native project files. To support complex behavior we've created config plugins, and mods (short for modifiers).

> Here is a [colorful chart](https://whimsical.com/UjytoYXT2RN43LywvWExfK) for visual learners.

## Plugins

A function which accepts a config, modifies it, then returns the modified config.

- Plugins should be named using the following convention: `with<Plugin Functionality>` i.e. `withFacebook`.
- Plugins should be synchronous and their return value should be serializable, except for any `mods` that are added.
- Optionally, a second argument can be passed to the plugin to configure it.

### Creating a Plugin

Here is an example of the most basic config plugin:

```ts
const withNothing = config => config;
```

Say you wanted to create a plugin which added custom values to the native iOS Info.plist:

```ts
const withMySDK = (config, { apiKey }) => {
  // Ensure the objects exist
  if (!config.ios) {
    config.ios = {};
  }
  if (!config.ios.infoPlist) {
    config.ios.infoPlist = {};
  }

  // Append the apiKey
  config.ios.infoPlist['MY_CUSTOM_NATIVE_IOS_API_KEY'] = apiKey;

  return config;
};

// 💡 Usage:

/// Create a config
const config = {
  name: 'my app',
};

/// Use the plugin
export default withMySDK(config, { apiKey: 'X-XXX-XXX' });
```

#### Chaining Plugins

Once you add a few plugins, your `app.config.js` code can become difficult to read and manipulate. To combat this, `@expo/config-plugins` provides a `withPlugins` function which can be used to chain plugins together and execute them in order.

```js
/// Create a config
const config = {
  name: 'my app',
};

// ❌ Hard to read
withDelta(withFoo(withBar(config, 'input 1'), 'input 2'), 'input 3');

// ✅ Easy to read
import { withPlugins } from '@expo/config-plugins';

withPlugins(config, [
  [withBar, 'input 1'],
  [withFoo, 'input 2'],
  [withDelta, 'input 3'],
]);
```

## Modifiers

An async function which accepts a config and a data object, then manipulates and returns both as an object.

Modifiers (mods for short) are added to the `mods` object of the Expo config. The `mods` object is different to the rest of the Expo config because it doesn't get serialized after the initial reading, this means you can use it to perform actions _during_ code generation. If possible, you should attempt to use basic plugins instead of mods as they're simpler to work with.

- mods are omitted from the manifest and cannot be accessed via `Constants.manifest`. mods exist for the sole purpose of modifying native files during code generation!
- mods can be used to read and write files safely during the `expo eject` command. This is how Expo CLI modifies the Info.plist, entitlements, xcproj, etc...
- mods are platform specific and should always be added to a platform specific object:

```js
{
  mods: {
    ios: { /* ... */ },
    android: { /* ... */ }
  }
}
```

### How it works

- The config is read using `getConfig` from `@expo/config`
- All of the core functionality supported by Expo is added via plugins in `withExpoIOSPlugins`. This is stuff like name, version, icons, locales, etc.
- The config is passed to the compiler `compileModifiersAsync`
- The compiler adds base mods which are responsible for reading data (like Info.plist), executing a named mod (like `mods.ios.infoPlist`), then writing the results to the file system.
- The compiler iterates over all of the mods and asynchronously evaluates them, providing some base props like the `projectRoot`.
  - After each mod, error handling asserts if the mod chain was corrupted by an invalid mod.

### Default Modifiers

The following default mods are provided by the mod compiler for common file manipulation:

- `mods.ios.infoPlist` -- Modify the `ios/<name>/Info.plist` as JSON (parsed with [`@expo/plist`](https://www.npmjs.com/package/@expo/plist)).
- `mods.ios.entitlements` -- Modify the `ios/<name>/<product-name>.entitlements` as JSON (parsed with [`@expo/plist`](https://www.npmjs.com/package/@expo/plist)).
- `mods.ios.expoPlist` -- Modify the `ios/<name>/Expo.plist` as JSON (Expo updates config for iOS) (parsed with [`@expo/plist`](https://www.npmjs.com/package/@expo/plist)).
- `mods.ios.xcodeproj` -- Modify the `ios/<name>.xcodeproj` as an `XcodeProject` object (parsed with [`xcode`](https://www.npmjs.com/package/xcode)).

- `mods.android.manifest` -- Modify the `android/app/src/main/AndroidManifest.xml` as JSON (parsed with [`xml2js`](https://www.npmjs.com/package/xml2js)).
- `mods.android.strings` -- Modify the `android/app/src/main/res/values/strings.xml` as JSON (parsed with [`xml2js`](https://www.npmjs.com/package/xml2js)).
- `mods.android.mainActivity` -- Modify the `android/app/src/main/<package>/MainActivity.java` as a string.
- `mods.android.appBuildGradle` -- Modify the `android/app/build.gradle` as a string.
- `mods.android.projectBuildGradle` -- Modify the `android/build.gradle` as a string.

After the mods are resolved, the contents of each mod will be written to disk. Custom default mods can be added to support new native files.
For example, you can create a mod to support the `GoogleServices-Info.plist`, and pass it to other mods.

### Creating a Modifier

Say you wanted to write a mod to update the Xcode Project's "product name":

```ts
import { ConfigPlugin, withXcodeProject } from '@expo/config-plugins';

const withCustomProductName: ConfigPlugin = (config, customName) => {
  return withXcodeProject(config, async config => {
    // config = { modResults, modRequest, ...expoConfig }

    const xcodeProject = config.modResults;
    xcodeProject.productName = customName;

    return config;
  });
};

// 💡 Usage:

/// Create a config
const config = {
  name: 'my app',
};

/// Use the plugin
export default withCustomProductName(config, 'new_name');
```

### Experimental functionality

Some parts of the mod system aren't fully flushed out, these parts use `withDangerousModifier` to read/write data without a base mod. These methods essentially act as their own base mod and cannot be extended. Icons for example currently use the dangerous mod to perform a single generation step with no ability to customize the results.

```ts
export const withIcons: ConfigPlugin = config => {
  return withDangerousModifier(config, async config => {
    // No modifications are made to the config
    await setIconsAsync(config, config.modRequest.projectRoot);
    return config;
  });
};
```

Be careful using `withDangerousModifier` as it is subject to change in the future.
The order with which it gets executed is not reliable either.
Currently dangerous mods run first before all other modifiers, this is because we use dangerous mods internally for large file system refactoring like when the package name changes.
