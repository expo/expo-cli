<!-- Title -->
<h1 align="center">
👋 Welcome to <br/><code>@expo/webpack-config</code>
</h1>

<!-- Header -->

<p align="center">
    <b>Webpack config that's optimized for running universal React and react-native-web projects</b>
    <br/>
    <br/>
    <a aria-label="Circle CI" href="https://circleci.com/gh/expo/expo-cli/tree/main">
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

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  // Customize the config before returning it.
  return config;
};
```

## Types

### `Environment`

The main options used to configure how `@expo/webpack-config` works.

| name          | type                                    | default     | description                                         |
| ------------- | --------------------------------------- | ----------- | --------------------------------------------------- |
| `projectRoot` | `string`                                | required    | Root of the Expo project.                           |
| `https`       | `boolean`                               | `false`     | Should the dev server use https protocol.           |
| `mode`        | `Mode`                                  | required    | The Webpack mode to bundle the project in.          |
| `platform`    | [`ExpoPlatform`](#ExpoPlatform)         | required    | The target platform to bundle for.                  |
| `pwa`         | `boolean`                               | `true`      | Generate the PWA image assets in production mode.   |
| `babel`       | [`ExpoBabelOptions`](#ExpoBabelOptions) | `undefined` | Control how the default Babel loader is configured. |

### `Environment` internal

| name        | type         | default     | description                                                        |
| ----------- | ------------ | ----------- | ------------------------------------------------------------------ |
| `config`    | `ExpoConfig` | `undefined` | The Expo project config, this should be read using `@expo/config`. |
| `locations` | `FilePaths`  | `undefined` | Paths used to locate where things are.                             |

### `ExpoPlatform`

| type   | description |
| ------ | ----------- | ----- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| `'ios' | 'android'   | 'web' | 'electron'` | The target platform to bundle for. Native platforms are experimental and require a special native runtime. |

### `ExpoBabelOptions`

Control how the default Babel loader is configured.

| name                                   | type       | default     | description                                                               |
| -------------------------------------- | ---------- | ----------- | ------------------------------------------------------------------------- |
| `dangerouslyAddModulePathsToTranspile` | `string[]` | `undefined` | Add the names of node_modules that should be included transpilation step. |

## Guides

### PWAs

- See the docs for [`expo-pwa`](../pwa) to learn more about creating the assets manually.
- Disable automatic PWA generation with `expo build:web --no-pwa`.
- `expo build:web` will automatically skip any PWA asset that's already linked in the project's local `web/index.html`.
- Having sharp CLI installed globally will speed up asset generation, if it's not installed, Jimp will be used instead.

#### Chrome PWAs

##### Manifest.json

The `manifest.json` will be created using the values in the project's `app.config.js`:

Generating the `manifest.json` will be skipped if the following exists in the project's `web/index.html`:

<details><summary>Show HTML</summary>

```html
<link rel="manifest" href="..." />
```

</details>

If the `icons` array is defined in your `manifest.json`, then Chrome PWA icon generation will be skipped.

##### Chrome PWA Icons

Icons will be generated using the file defined in your `app.config.js` under `android.icon` and it'll fallback to `icon`.

<details><summary>Show manifest.json</summary>

```json
{
  "icons": [
    {
      "src": "...",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "...",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "...",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

</details>

#### Favicons

Favicons will be generated using the file defined in your `app.config.js` under `web.favicon` and it'll fallback to `icon`.

Asset generation for Favicons will be individually skipped if any of the following fields exist in your `web/index.html`:

<details><summary>Show HTML</summary>

```html
<link rel="icon" type="image/png" sizes="16x16" href="..." />
<link rel="icon" type="image/png" sizes="32x32" href="..." />
<link rel="shortcut icon" href="..." />
```

</details>

#### Safari PWAs

Icons will be generated using the file defined in your `app.config.js` under `ios.icon` and it'll fallback to `icon`. The splash screens look at `ios.splash` and fallback to `splash`.

Asset generation for Safari PWA icons/splash screens will be individually skipped if any of the following fields exist in your `web/index.html`:

##### Icons

<details><summary>Show HTML</summary>

```html
<link rel="apple-touch-icon" sizes="180x180" href="..." />
```

</details>

##### Splash Screens

<details><summary>Show HTML</summary>

```html
<link
  rel="apple-touch-startup-image"
  media="screen and (device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
  href="..."
/>
<link
  rel="apple-touch-startup-image"
  media="screen and (device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
  href="..."
/>
<link
  rel="apple-touch-startup-image"
  media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
  href="..."
/>
<link
  rel="apple-touch-startup-image"
  media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
  href="..."
/>
<link
  rel="apple-touch-startup-image"
  media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
  href="..."
/>
<link
  rel="apple-touch-startup-image"
  media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
  href="..."
/>
<link
  rel="apple-touch-startup-image"
  media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
  href="..."
/>
<link
  rel="apple-touch-startup-image"
  media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
  href="..."
/>
<link
  rel="apple-touch-startup-image"
  media="screen and (device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
  href="..."
/>
<link
  rel="apple-touch-startup-image"
  media="screen and (device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
  href="..."
/>
<link
  rel="apple-touch-startup-image"
  media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
  href="..."
/>
<link
  rel="apple-touch-startup-image"
  media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
  href="..."
/>
```

</details>

### Include modules

You may find that you want to include universal modules that aren't part of the default modules. You can do this by customizing the Webpack config:

```ts
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
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

### Modify the babel loader

If you want to modify the babel loader further, you can retrieve it using the helper method `getExpoBabelLoader` like this:

```ts
const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const { getExpoBabelLoader } = require('@expo/webpack-config/utils');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  const loader = getExpoBabelLoader(config);
  if (loader) {
    // Modify the loader...
  }
  return config;
};
```

### Service workers

> Example of using service workers with Expo: `npx create-react-native-app -t with-workbox`

This webpack config currently does not supply service workers by default, they can be added to the project locally: [Adding Service Workers](https://github.com/expo/fyi/blob/main/enabling-web-service-workers.md).

## Environment Variables

- `EXPO_WEBPACK_DEFINE_ENVIRONMENT_AS_KEYS`: Should the define plugin explicitly set environment variables like `process.env.FOO` instead of creating an object like `proces.env: { FOO }`. Defaults to `false`. Next.js uses this to prevent overwriting injected environment variables.
- `IMAGE_INLINE_SIZE_LIMIT`: By default, images smaller than 10,000 bytes are encoded as a data URI in base64 and inlined in the CSS or JS build artifact. Set this to control the size limit in bytes. Setting it to 0 will disable the inlining of images. This is only used in production.

## License

The Expo source code is made available under the [MIT license](LICENSE). Some of the dependencies are licensed differently, with the BSD license, for example.

<!-- Footer -->

---

<p>
    <a aria-label="sponsored by expo" href="http://expo.dev">
        <img src="https://img.shields.io/badge/Sponsored_by-Expo-4630EB.svg?style=for-the-badge&logo=EXPO&labelColor=000&logoColor=fff" target="_blank" />
    </a>
    <a aria-label="expo webpack-config is free to use" href="/LICENSE" target="_blank">
        <img align="right" alt="License: MIT" src="https://img.shields.io/badge/License-MIT-success.svg?style=for-the-badge&color=33CC12" target="_blank" />
    </a>
</p>

[docs]: https://docs.expo.dev/guides/customizing-webpack/
[docs-latest]: https://github.com/expo/expo/blob/main/docs/pages/versions/unversioned/guides/customizing-webpack.md
