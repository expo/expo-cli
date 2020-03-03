<!-- Title -->
<h1 align="center">
👋 Welcome to <br/><code>@expo/webpack-config</code>
</h1>

<!-- Header -->

<p align="center">
    <b>Webpack config that's optimized for running React Native web projects</b>
    <br/>
    <br/>
    <a aria-label="Circle CI" href="https://circleci.com/gh/expo/expo-cli/tree/master">
        <img alt="Circle CI" src="https://flat.badgen.net/circleci/github/expo/expo-cli?label=Circle%20CI&labelColor=555555&icon=circleci">
    </a>
</p>

---

## [Documentation][docs]

To learn more about how to use this Webpack config, check out the docs here: [Customizing the Webpack config][docs]

### Contributing to the docs

- [Documentation for the master branch][docs-latest]
- [Documentation for the latest stable release][docs]

## API

Running `expo customize:web` will generate this default config in your project.

```js
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function(env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  // Customize the config before returning it.
  return config;
};
```

## Types

### `Environment`

The main options used to configure how `@expo/webpack-config` works.

| name                        | type                                    | default     | description                                                                     |
| --------------------------- | --------------------------------------- | ----------- | ------------------------------------------------------------------------------- |
| `projectRoot`               | `string`                                | required    | Root of the Expo project.                                                       |
| `https`                     | `boolean`                               | `false`     | Should the dev server use https protocol.                                       |
| `offline`                   | `boolean`                               | `true`      | Passing `false` will disable offline support and skip adding a service worker.   |
| `mode`                      | `Mode`                                  | required    | The Webpack mode to bundle the project in.                                      |
| `platform`                  | [`ExpoPlatform`](#ExpoPlatform)         | required    | The target platform to bundle for. Only `web` and `electron` are supported.     |
| `removeUnusedImportExports` | `boolean`                               | `false`     | Enables advanced tree-shaking with deep scope analysis.                         |
| `pwa`                       | `boolean`                               | `true`      | Generate the PWA image assets in production mode.                               |
| `report`                    | `Report`                                | `undefined` | Configure Webpack bundle reports. Using this adds significant time to rebuilds. |
| `babel`                     | [`ExpoBabelOptions`](#ExpoBabelOptions) | `undefined` | Control how the default Babel loader is configured.                             |

### `Environment` internal

| name        | type         | default     | description                                                        |
| ----------- | ------------ | ----------- | ------------------------------------------------------------------ |
| `config`    | `ExpoConfig` | `undefined` | The Expo project config, this should be read using `@expo/config`. |
| `locations` | `FilePaths`  | `undefined` | Paths used to locate where things are.                             |

### `ExpoPlatform`

| type                                     | description                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| `'ios' | 'android' | 'web' | 'electron'` | The target platform to bundle for. Only `web` and `electron` are supported. |

### `ExpoBabelOptions`

Control how the default Babel loader is configured.

| name                                   | type       | default     | description                                                               |
| -------------------------------------- | ---------- | ----------- | ------------------------------------------------------------------------- |
| `dangerouslyAddModulePathsToTranspile` | `string[]` | `undefined` | Add the names of node_modules that should be included transpilation step. |

## Guides

### Include modules

You may find that you want to include universal modules that aren't part of the default modules. You can do this by customizing the Webpack config:

```ts
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function(env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: [
          // Ensure that all packages starting with @evanbacon are transpiled.
          '@evanbacon',
        ],
      },
    },
    argv
  );
  return config;
};
```

**`withUnimodules`**

If you're adding support to some other Webpack config like in Storybook or Gatsby you can use the same process to include custom modules:

```ts
const { withUnimodules } = require('@expo/webpack-config/addons');

module.exports = function() {
  const someWebpackConfig = {
    /* Your custom Webpack config */
  };

  // Add Expo support...
  const configWithExpo = withUnimodules(someWebpackConfig, {
    projectRoot: __dirname,
    babel: {
      dangerouslyAddModulePathsToTranspile: [
        // Ensure that all packages starting with @evanbacon are transpiled.
        '@evanbacon',
      ],
    },
  });

  return configWithExpo;
};
```

This method should be used instead of using the `expo.web.build.babel.include` field of the `app.json`.

### Modify the babel loader

If you want to modify the babel loader further, you can retrieve it using the helper method `getExpoBabelLoader` like this:

```ts
const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const { getExpoBabelLoader } = require('@expo/webpack-config/utils');

module.exports = async function(env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  const loader = getExpoBabelLoader(config);
  if (loader) {
    // Modify the loader...
  }
  return config;
};
```

### Service workers

Service workers are great for emulating native functionality, so Expo web takes full advantage of them. But sometimes you'll need to drop down and modify them yourself.

#### How Expo service workers ... work

By default Expo web has a two part service worker. The first part `web/expo-service-worker.js` setups up optional features of the Expo SDK like Notifications. The second part `web/service-worker.js` is generated by [Workbox][workbox] and manages the offline support.

The entry point for the service workers is a file called: [`register-service-worker.js`](./web-default/register-service-worker.js). This file gets copied to your static folder and registered in Webpack's `entry` property (which is why you don't see it referenced in `index.html`).

#### Extending the service worker

If you'd like to add extra functionality, you can simply:

- Eject the Webpack config: `expo customize:web`
  - Select `web/expo-service-worker.js`
- Modify the `web/expo-service-worker.js` however you'd like!

#### Fully disabling the service worker

This can have some unfortunate side-effects as application libraries like expo-notifications may expect the SW to exist. Proceed with caution.

- Eject the Webpack config: `expo customize:web`
  - Select `webpack.config.js`
- Modify the `webpack.config.js`:

```js
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function(env, argv) {
  // Set offline to `false`
  const config = await createExpoWebpackConfigAsync({ ...env, offline: false }, argv);
  return config;
};
```

- This will do the following: 
  - Skip registering [`register-service-worker.js`](./web-default/register-service-worker.js) in the Webpack config `entry`.
  - Skip including the [Webpack Workbox plugin][workbox] and creating the `web/service-worker.js`.
  - Skip including the [`web/expo-service-worker.js`](./web-default/expo-service-worker.js)

[workbox]: https://developers.google.com/web/tools/workbox

## Exports

### addons

For adding features to an existing Webpack config.

#### `withUnimodules`

```js
import { withUnimodules } from '@expo/webpack-config/addons';
```

Wrap your existing webpack config with support for Unimodules (Expo web). ex: **Storybook** `({ config }) => withUnimodules(config)`

**params**

- `webpackConfig: AnyConfiguration = {}` Optional existing Webpack config to modify.
- `env: InputEnvironment = {}` Optional [`Environment`][#environment] options for configuring what features the Webpack config supports.
- `argv: Arguments = {}`

#### `withWorkbox`

Add offline support with Workbox (`workbox-webpack-plugin`).

```js
import { withWorkbox } from '@expo/webpack-config/addons';
```

#### `withOptimizations`

```js
import { withOptimizations } from '@expo/webpack-config/addons';
```

#### `withReporting`

```js
import { withReporting } from '@expo/webpack-config/addons';
```

#### `withCompression`

```js
import { withCompression } from '@expo/webpack-config/addons';
```

#### `withAlias`

Add aliases for React Native web.

```js
import { withAlias } from '@expo/webpack-config/addons';
```

#### `withDevServer`

```js
import { withDevServer } from '@expo/webpack-config/addons';
```

#### `withNodeMocks`

```js
import { withNodeMocks } from '@expo/webpack-config/addons';
```

#### `withEntry`

```js
import { withEntry } from '@expo/webpack-config/addons';
```

#### `withTypeScriptAsync`

```js
import { withTypeScriptAsync } from '@expo/webpack-config/addons';
```

### env

Getting the config, paths, mode, and various other settings in your environment.

#### `getConfig`

```js
import { getConfig } from '@expo/webpack-config/env';
```

#### `getMode`

```js
import { getMode } from '@expo/webpack-config/env';
```

#### `validateEnvironment`

```js
import { validateEnvironment } from '@expo/webpack-config/env';
```

#### `aliases`

```js
import { aliases } from '@expo/webpack-config/env';
```

#### `getPaths`

```js
import { getPaths } from '@expo/webpack-config/env';
```

#### `getPathsAsync`

```js
import { getPathsAsync } from '@expo/webpack-config/env';
```

#### `getServedPath`

```js
import { getServedPath } from '@expo/webpack-config/env';
```

#### `getPublicPaths`

```js
import { getPublicPaths } from '@expo/webpack-config/env';
```

#### `getProductionPath`

```js
import { getProductionPath } from '@expo/webpack-config/env';
```

#### `getAbsolute`

```js
import { getAbsolute } from '@expo/webpack-config/env';
```

#### `getModuleFileExtensions`

```js
import { getModuleFileExtensions } from '@expo/webpack-config/env';
```

### loaders

The module rules used to load various files.

#### `imageLoaderRule`

```js
import { imageLoaderRule } from '@expo/webpack-config/loaders';
```

This is needed for webpack to import static images in JavaScript files.
"url" loader works like "file" loader except that it embeds assets smaller than specified limit in bytes as data URLs to avoid requests.
A missing `test` is equivalent to a match.

#### `fallbackLoaderRule`

```js
import { fallbackLoaderRule } from '@expo/webpack-config/loaders';
```

"file" loader makes sure those assets get served by WebpackDevServer.
When you `import` an asset, you get its (virtual) filename.
In production, they would get copied to the `build` folder.
This loader doesn't use a "test" so it will catch all modules
that fall through the other loaders.

#### `styleLoaderRule`

```js
import { styleLoaderRule } from '@expo/webpack-config/loaders';
```

Default CSS loader.

### plugins

```js
import /* */ '@expo/webpack-config/plugins';
```

Custom versions of Webpack Plugins that are optimized for use with React Native.

#### `ExpoDefinePlugin`

```js
import { ExpoDefinePlugin } from '@expo/webpack-config/plugins';
```

Required for `expo-constants` https://docs.expo.io/versions/latest/sdk/constants/.
This surfaces the `app.json` (config) as an environment variable which is then parsed by `expo-constants`.

#### `ExpoHtmlWebpackPlugin`

```js
import { ExpoHtmlWebpackPlugin } from '@expo/webpack-config/plugins';
```

Generates an `index.html` file with the <script> injected.

#### `ExpoInterpolateHtmlPlugin`

```js
import { ExpoInterpolateHtmlPlugin } from '@expo/webpack-config/plugins';
```

Add variables to the `index.html`.

### utils

Tools for resolving fields, or searching and indexing loaders and plugins.

#### `resolveEntryAsync`

```js
import { resolveEntryAsync } from '@expo/webpack-config/utils';
```

## License

The Expo source code is made available under the [MIT license](LICENSE). Some of the dependencies are licensed differently, with the BSD license, for example.

<!-- Footer -->

---

<p>
    <a aria-label="sponsored by expo" href="http://expo.io">
        <img src="https://img.shields.io/badge/Sponsored_by-Expo-4630EB.svg?style=for-the-badge&logo=EXPO&labelColor=000&logoColor=fff" target="_blank" />
    </a>
    <a aria-label="expo webpack-config is free to use" href="/LICENSE" target="_blank">
        <img align="right" alt="License: MIT" src="https://img.shields.io/badge/License-MIT-success.svg?style=for-the-badge&color=33CC12" target="_blank" />
    </a>
</p>

[docs]: https://docs.expo.io/versions/latest/guides/customizing-webpack/
[docs-latest]: https://github.com/expo/expo/blob/master/docs/pages/versions/unversioned/guides/customizing-webpack.md
