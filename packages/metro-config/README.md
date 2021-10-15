# expo-metro-config

A Metro config for running React Native projects with the Metro bundler.

## Exotic

When enabled, exotic mode adds the following assumptions:

- Resolver Fields: `browser, main`
  - The `react-native` field in module `package.json` is **NOT** supported.
  - Packages using `react-native-builder-bob` will default to using the CommonJS setting in exotic. If you need to modify your Node modules manually, be sure to change the files in your `lib/commonjs/` folder.
- Extensions: `ts, tsx, js, jsx, json, cjs`
  - `cjs` is added.

### Default Rules

1. Modules with `.*/lib/commonjs/` are skipped.
2. React Native is transformed with Sucrase to remove flow types and other unsupported language features.
   - If the React Native team transpiles react-native before shipping, we can remove this step.
3. Expo modules are transformed with Sucrase to remove import/export syntax. This is temporary while we figure out how to add ESModule support to the native runtime.
   - This is for improved tree shaking.
4. Known community modules (especially ones included in Expo Go) are transformed using a more expensive Sucrase preset
   - We may add support for extending this list in the future.
5. All other node modules are skipped.
6. All remaining code is assumed to be application code and transpiled with your local Babel preset.
   - "Victory Native" packages use too many language features so they are transpiled with Babel.

### Extra Customization

If you need more customization, you can import the multi-rule transformer and extend it locally. Check the contents of [createExoticTransformer.ts](./src/transformer/createExoticTransformer.ts) for an example.

### Troubleshooting

You should see the following log when Exotic is enabled:

> Unstable feature **EXPO_USE_EXOTIC** is enabled. Bundling may not work as expected, and is subject to breaking changes.

Or if `EXPO_DEBUG=1` is enabled, you'll see exotic mode in the settings breakdown.

If you don't see this message, check to ensure your `metro.config.js` is using `@expo/metro-config` and the version is at least `0.2.2`.

The transformer can be debugged using the environment variable: `DEBUG=expo:metro:exotic-babel-transformer` or `DEBUG=expo:metro:*`

### Monorepos

> Experimental

You can reach into the internals of the package to extend the transformer and add monorepo support:

`metro-exotic-transformer.js`

```js
const {
  createExoticTransformer,
} = require('@expo/metro-config/build/transformer/createExoticTransformer');

module.exports = createExoticTransformer({
  // Add extra node_module paths
  nodeModulesPaths: [
    'node_modules',
    // Generally you'll add this when your config is in `apps/my-app/metro.config.js`
    '../../node_modules',
    // If you have custom packages in a `packages/` folder
    '../../packages',
  ],
});
```

Then use it in your project:

`metro.config.js`

```js
const { createMetroConfiguration } = require('expo-yarn-workspaces');
const { EXPO_USE_EXOTIC } = require('@expo/metro-config');
const baseConfig = createMetroConfiguration(__dirname);

// Optionally you can keep the environment variable working.
if (EXPO_USE_EXOTIC) {
  // Use the new transformer
  if (!baseConfig.transformer) baseConfig.transformer = {};
  baseConfig.transformer.babelTransformerPath = require.resolve('./metro-exotic-transformer');
}

module.exports = baseConfig;
```
