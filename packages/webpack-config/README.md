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

### addons

For composing features into an existing Webpack config.

```js
import /* */ '@expo/webpack-config/addons';
```

### env

Getting the config, paths, mode, and various other settings in your environment.

```js
import /* */ '@expo/webpack-config/env';
```

### loaders

The module rules used to load various files.

```js
import /* */ '@expo/webpack-config/loaders';
```

### plugins

Custom versions of Webpack Plugins that are optimized for use with React Native.

```js
import /* */ '@expo/webpack-config/plugins';
```

### utils

Tools for resolving fields, or searching and indexing loaders and plugins.

```js
import /* */ '@expo/webpack-config/utils';
```

## Guides

### Include modules

You may find that you want to include universal modules that aren't part of the default modules. You can do this by customizing the Webpack config:

```ts
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function(env, argv) {
    const config = await createExpoWebpackConfigAsync({
        ...env,
        babel: {
            dangerouslyAddModulePathsToTranspile: [
                // Ensure that all packages starting with @evanbacon are transpiled.
                '@evanbacon'
            ]
        }
    }, argv);
    return config;
};
```

**`withUnimodules`**

If you're adding support to some other Webpack config like in Storybook or Gatsby you can use the same process to include custom modules:

```ts
const { withUnimodules } = require('@expo/webpack-config/addons');

module.exports = function() {
  const someWebpackConfig = { /* Your custom Webpack config */ }

  // Add Expo support...
  const configWithExpo = withUnimodules(someWebpackConfig, {
      projectRoot: __dirname,
      babel: {
          dangerouslyAddModulePathsToTranspile: [
              // Ensure that all packages starting with @evanbacon are transpiled.
              '@evanbacon'
          ]
      }
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
