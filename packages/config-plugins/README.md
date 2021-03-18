# Expo Config Plugins

The Expo config is a powerful tool for generating native app code from a unified JavaScript interface. Most basic functionality can be controlled by using the the [static Expo config](https://docs.expo.io/versions/latest/config/app/), but some features require manipulation of the native project files. To support complex behavior we've created config plugins, and mods (short for modifiers).

> 💡 **Hands-on Learners**: Use [this sandbox][sandbox] to play with the core functionality of Expo config plugins. For more complex tests, use a local Expo project, with `expo eject --no-install` to apply changes.

- [Usage](#usage)
- [What are plugins](#what-are-plugins)
- [Creating a plugin](#creating-a-plugin)
  - [Importing plugins](#importing-plugins)
  - [Chaining plugins](#chaining-plugins)
- [What are mods](#what-are-mods)
- [How mods works](#how-mods-works)
  - [Default mods](#default-mods)
  - [Mod plugins](#mod-plugins)
- [Creating a mod](#creating-a-mod)
  - [Experimental functionality](#experimental-functionality)
- [Plugin module resolution](#plugin-module-resolution)
  - [Project file](#project-file)
  - [app.plugin.js](#apppluginjs)
  - [Node module default file](#node-module-default-file)
  - [Project folder](#project-folder)
  - [Module internals](#module-internals)
  - [Raw functions](#raw-functions)
- [Why app.plugin.js for plugins](#why-apppluginjs-for-plugins)

**Quick facts**

- Plugins are functions that can change values on your Expo config.
- Plugins are mostly meant to be used with [`expo eject`][cli-eject] or `eas build` commands.
- We recommend you use plugins with `app.config.json` or `app.config.js` instead of `app.json` (no top-level `expo` object is required).
- `mods` are async functions that modify native project files, such as source code or configuration (plist, xml) files.
- Changes performed with `mods` will require rebuilding the affected native projects.
- `mods` are removed from the public app manifest.
- 💡 Everything in the Expo config must be able to be converted to JSON (with the exception of the `mods` field). So no async functions outside of `mods` in your config plugins!

## Usage

Here is a basic config that uses the `expo-splash-screen` plugin:

```json
{
  "name": "my app",
  "plugins": ["expo-splash-screen"]
}
```

Some plugins can be customized by passing an array, where the second argument is the options:

```json
{
  "name": "my app",
  "plugins": [
    [
      "expo-splash-screen",
      {
        /* Values passed to the plugin */
      }
    ]
  ]
}
```

If you run `expo eject`, the `mods` will be compiled, and the native files be changed! The changes won't be fully shown until you rebuild the native project with `eas build -p ios` or locally with `npx react-native run-ios` or `npx react-native run-android`.

For instance, if you add a plugin that adds permission messages to your app, the app will need to be rebuilt.

And that's it! Now you're using Config plugins. No more having to interact with the native projects!

> 💡 Check out all the different ways you can import `plugins`: [plugin module resolution](#Plugin-module-resolution)

## What are plugins

Plugins are **synchronous** functions that accept an [`ExpoConfig`][config-docs] and return a modified [`ExpoConfig`][config-docs].

- Plugins should be named using the following convention: `with<Plugin Functionality>` i.e. `withFacebook`.
- Plugins should be synchronous and their return value should be serializable, except for any `mods` that are added.
- Optionally, a second argument can be passed to the plugin to configure it.
- `plugins` are always invoked when the config is read by `@expo/config`s `getConfig` method. However, the `mods` are only invoked during the "syncing" phase of `expo eject`.

## Creating a plugin

> 💡 Hands-on learners: Try this [sandbox](https://codesandbox.io/s/expo-config-plugins-basic-example-xopto?file=/src/project/app.config.js) (check the terminal logs).

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

### Importing plugins

You may want to create a plugin in a different file, here's how:

- The root file can be any JS file or a file named `app.plugin.js` in the [root of a Node module](#root-app.plugin.js).
- The file should export a function that satisfies the [`ConfigPlugin`][configplugin] type.
- Plugins should be transpiled for Node environments ahead of time!
  - They should support the versions of Node that [Expo supports](https://docs.expo.io/get-started/installation/#requirements) (LTS).
  - No `import/export` keywords, use `module.exports` in the shipped plugin file.
  - Expo only transpiles the user's initial `app.config` file, anything more would require a bundler which would add too many "opinions" for a config file.

Consider the following example that changes the config name:

```
╭── app.config.js ➡️ Expo Config
╰── my-plugin.js ➡️ Our custom plugin file
```

`my-plugin.js`

```js
module.exports = function withCustomName(config, name) {
  // Modify the config
  config.name = 'custom-' + name;
  // Return the results
  return config;
};
```

`app.config.json`

```json
{
  "name": "my-app",
  "plugins": ["./my-plugin", "app"]
}
```

↓ ↓ ↓

**Evaluated config JSON**

```json
{
  "name": "custom-app",
  "plugins": ["./my-plugin", "app"]
}
```

### Chaining plugins

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
  // When no input is required, you can just pass the method...
  withDelta,
]);
```

To support JSON configs, we also added the `plugins` array which just uses `withPlugins` under the hood.
Here is the same config as above, but even simpler:

```js
export default {
  name: 'my app',
  plugins: [
    [withBar, 'input 1'],
    [withFoo, 'input 2'],
    [withDelta, 'input 3'],
  ],
};
```

## What are mods

An async function which accepts a config and a data object, then manipulates and returns both as an object.

Modifiers (mods for short) are added to the `mods` object of the Expo config. The `mods` object is different to the rest of the Expo config because it doesn't get serialized after the initial reading, this means you can use it to perform actions _during_ code generation. If possible, you should attempt to use basic plugins instead of mods as they're simpler to work with.

- `mods` are omitted from the manifest and **cannot** be accessed via `Updates.manifest`. mods exist for the sole purpose of modifying native files during code generation!
- `mods` can be used to read and write files safely during the `expo eject` command. This is how Expo CLI modifies the Info.plist, entitlements, xcproj, etc...
- `mods` are platform specific and should always be added to a platform specific object:

`app.config.js`

```js
module.exports = {
  name: 'my-app',
  mods: {
    ios: {
      /* iOS mods... */
    },
    android: {
      /* Android mods... */
    },
  },
};
```

## How mods work

- The config is read using `getConfig` from `@expo/config`
- All of the core functionality supported by Expo is added via plugins in `withExpoIOSPlugins`. This is stuff like name, version, icons, locales, etc.
- The config is passed to the compiler `compileModifiersAsync`
- The compiler adds base mods which are responsible for reading data (like `Info.plist`), executing a named mod (like `mods.ios.infoPlist`), then writing the results to the file system.
- The compiler iterates over all of the mods and asynchronously evaluates them, providing some base props like the `projectRoot`.
  - After each mod, error handling asserts if the mod chain was corrupted by an invalid mod.

<!-- TODO: Move to a section about mod compiler -->

> 💡 Here is a [colorful chart](https://whimsical.com/UjytoYXT2RN43LywvWExfK) of the mod compiler for visual learners.

### Default mods

The following default mods are provided by the mod compiler for common file manipulation:

- `mods.ios.appDelegate` -- Modify the `ios/<name>/AppDelegate.m` as a string.
- `mods.ios.infoPlist` -- Modify the `ios/<name>/Info.plist` as JSON (parsed with [`@expo/plist`](https://www.npmjs.com/package/@expo/plist)).
- `mods.ios.entitlements` -- Modify the `ios/<name>/<product-name>.entitlements` as JSON (parsed with [`@expo/plist`](https://www.npmjs.com/package/@expo/plist)).
- `mods.ios.expoPlist` -- Modify the `ios/<name>/Expo.plist` as JSON (Expo updates config for iOS) (parsed with [`@expo/plist`](https://www.npmjs.com/package/@expo/plist)).
- `mods.ios.xcodeproj` -- Modify the `ios/<name>.xcodeproj` as an `XcodeProject` object (parsed with [`xcode`](https://www.npmjs.com/package/xcode)).

- `mods.android.manifest` -- Modify the `android/app/src/main/AndroidManifest.xml` as JSON (parsed with [`xml2js`](https://www.npmjs.com/package/xml2js)).
- `mods.android.strings` -- Modify the `android/app/src/main/res/values/strings.xml` as JSON (parsed with [`xml2js`](https://www.npmjs.com/package/xml2js)).
- `mods.android.mainActivity` -- Modify the `android/app/src/main/<package>/MainActivity.java` as a string.
- `mods.android.appBuildGradle` -- Modify the `android/app/build.gradle` as a string.
- `mods.android.projectBuildGradle` -- Modify the `android/build.gradle` as a string.
- `mods.android.settingsGradle` -- Modify the `android/settings.gradle` as a string.
- `mods.android.gradleProperties` -- Modify the `android/gradle.properties` as a `Properties.PropertiesItem[]`.

After the mods are resolved, the contents of each mod will be written to disk. Custom default mods can be added to support new native files.
For example, you can create a mod to support the `GoogleServices-Info.plist`, and pass it to other mods.

### Mod plugins

Mods are responsible for a lot of things, so they can be pretty difficult to understand at first.
If you're developing a feature that requires mods, it's best not to interact with them directly.

Instead you should use the helper mods provided by `@expo/config-plugins`:

- iOS
  - `withAppDelegate`
  - `withInfoPlist`
  - `withEntitlementsPlist`
  - `withExpoPlist`
  - `withXcodeProject`
- Android
  - `withAndroidManifest`
  - `withStringsXml`
  - `withMainActivity`
  - `withProjectBuildGradle`
  - `withAppBuildGradle`
  - `withSettingsGradle`
  - `withGradleProperties`

A mod plugin gets passed a `config` object with additional properties `modResults` and `modRequest` added to it.

- `modResults`: The object to modify and return. The type depends on the mod that's being used.
- `modRequest`: Additional properties supplied by the mod compiler.
  - `projectRoot: string`: Project root directory for the universal app.
  - `platformProjectRoot: string`: Project root for the specific platform.
  - `modName: string`: Name of the mod.
  - `platform: ModPlatform`: Name of the platform used in the mods config.
  - `projectName?: string`: iOS only: The path component used for querying project files. ex. `projectRoot/ios/[projectName]/`

## Creating a mod

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

Some parts of the mod system aren't fully flushed out, these parts use `withDangerousModifier` to read/write data without a base mod. These methods essentially act as their own base mod and cannot be extended. Icons for example, currently use the dangerous mod to perform a single generation step with no ability to customize the results.

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

## Plugin module resolution

The strings passed to the `plugins` array can be resolved in a few different ways.

> Any resolution pattern that isn't specified below is unexpected behavior, and subject to breaking changes.

### Project file

You can quickly create a plugin in your project and use it in your config.

- ✅ `'./my-config-plugin'`
- ❌ `'./my-config-plugin.js'`

```
╭── app.config.js ➡️ Expo Config
╰── my-config-plugin.js ➡️ ✅ `module.exports = (config) => config`
```

### app.plugin.js

Sometimes you want your package to export React components and also support a plugin, to do this, multiple entry points need to be used (because the transpilation (Babel preset) may be different).
If a `app.plugin.js` file is present in the root of a Node module's folder, it'll be used instead of the package's `main` file.

- ✅ `'expo-splash-screen'`
- ❌ `'expo-splash-screen/app.plugin.js'`

```
╭── app.config.js ➡️ Expo Config
╰── node_modules/expo-splash-screen/ ➡️ Module installed from NPM (works with Yarn workspaces as well).
    ├── package.json ➡️ The `main` file will be used if `app.plugin.js` doesn't exist.
    ├── app.plugin.js ➡️ ✅ `module.exports = (config) => config` -- must export a function.
    ╰── build/index.js ➡️ ❌ Ignored because `app.plugin.js` exists. This could be used with `expo-splash-screen/build/index.js`
```

### Node module default file

A config plugin in a node module (without an `app.plugin.js`) will use the `main` file defined in the `package.json`.

- ✅ `'expo-splash-screen'`
- ❌ `'expo-splash-screen/build/index'`

```
╭── app.config.js ➡️ Expo Config
╰── node_modules/expo-splash-screen/ ➡️ Module installed from NPM (works with Yarn workspaces as well).
    ├── package.json ➡️ The `main` file points to `build/index.js`
    ╰── build/index.js ➡️  ✅ Node resolves to this module.
```

### Project folder

- ✅ `'./my-config-plugin'`
- ❌ `'./my-config-plugin.js'`

This is different to how Node modules work because `app.plugin.js` won't be resolved by default in a directory. You'll have to manually specify `./my-config-plugin/app.plugin.js` to use it, otherwise `index.js` in the directory will be used.

```
╭── app.config.js ➡️ Expo Config
╰── my-config-plugin/ ➡️ Folder containing plugin code
    ╰── index.js ➡️ ✅ By default, Node resolves a folder's index.js file as the main file.
```

### Module internals

If a file inside a Node module is specified, then the module's root `app.plugin.js` resolution will be skipped. This is referred to as "reaching inside a package" and is considered **bad form**.
We support this to make testing, and plugin authoring easier, but we don't expect library authors to expose their plugins like this as a public API.

- ❌ `'expo-splash-screen/build/index.js'`
- ❌ `'expo-splash-screen/build'`

```
╭── app.config.js ➡️ Expo Config
╰── node_modules/expo-splash-screen/ ➡️ Module installed from npm (works with Yarn workspaces as well).
    ├── package.json ➡️ The `main` file will be used if `app.plugin.js` doesn't exist.
    ├── app.plugin.js ➡️ ❌ Ignored because the reference reaches into the package internals.
    ╰── build/index.js ➡️ ✅ `module.exports = (config) => config`
```

### Raw functions

You can also just pass in a config plugin.

```js
const withCustom = (config, props) => config;

const config = {
  plugins: [
    [
      withCustom,
      {
        /* props */
      },
    ],
    // Without props
    withCustom,
  ],
};
```

One caveat to using functions instead of strings is that serialization will replace the function with the function's name. This keeps **manifests** (kinda like the `index.html` for your app) working as expected.

Here is what the serialized config would look like:

```json
{
  "plugins": [["withCustom", {}], "withCustom"]
}
```

## Why app.plugin.js for plugins

Config resolution searches for a `app.plugin.js` first when a Node module name is provided.
This is because Node environments are often different to iOS, Android, or web JS environments and therefore require different transpilation presets (ex: `module.exports` instead of `import/export`).

Because of this reasoning, the root of a Node module is searched instead of right next to the `index.js`. Imagine you had a TypeScript Node module where the transpiled main file was located at `build/index.js`, if Expo config plugin resolution searched for `build/app.plugin.js` you'd lose the ability to transpile the file differently.

[config-docs]: https://docs.expo.io/versions/latest/config/app/
[cli-eject]: https://docs.expo.io/workflow/expo-cli/#eject
[sandbox]: https://codesandbox.io/s/expo-config-plugins-8qhof?file=/src/project/app.config.js
[configplugin]: ./src/Plugin.types.ts

## Debugging

You can debug config plugins by running `expo prebuild`. If `EXPO_DEBUG` is enabled, the plugin stack logs will be printed, these are useful for viewing which mods ran, and in what order they ran in. To view all static plugin resolution errors, enable `EXPO_CONFIG_PLUGIN_VERBOSE_ERRORS`, this should only be needed for plugin authors.
By default some automatic plugin errors are hidden because they're usually related to versioning issues and aren't very helpful (i.e. legacy package doesn't have a config plugin yet).
