/**
 * A bare webpack config that is required for using
 * react-native-web & Unimodules in the browser.
 *
 * This should be used to inject basic support into systems
 * like react-scripts and storybook.
 */

const ManifestPlugin = require('webpack-manifest-plugin');
const { createEnvironmentConstants } = require('@expo/config');
const { DefinePlugin } = require('webpack');
const createClientEnvironment = require('./createClientEnvironment');
const getPaths = require('./utils/getPaths');
const { overrideWithPropertyOrConfig } = require('./utils/config');
const getMode = require('./utils/getMode');
const DEFAULT_ALIAS = {
  // Alias direct react-native imports to react-native-web
  'react-native$': 'react-native-web',
  '@react-native-community/netinfo': 'react-native-web/dist/exports/NetInfo',
  // Add polyfills for modules that react-native-web doesn't support
  // Depends on expo-asset
  'react-native/Libraries/Image/AssetSourceResolver$': 'expo-asset/build/AssetSourceResolver',
  'react-native/Libraries/Image/assetPathUtils$': 'expo-asset/build/Image/assetPathUtils',
  'react-native/Libraries/Image/resolveAssetSource$': 'expo-asset/build/resolveAssetSource',
  // Alias internal react-native modules to react-native-web
  'react-native/Libraries/Components/View/ViewStylePropTypes$':
    'react-native-web/dist/exports/View/ViewStylePropTypes',
  'react-native/Libraries/EventEmitter/RCTDeviceEventEmitter$':
    'react-native-web/dist/vendor/react-native/NativeEventEmitter/RCTDeviceEventEmitter',
  'react-native/Libraries/vendor/emitter/EventEmitter$':
    'react-native-web/dist/vendor/react-native/emitter/EventEmitter',
  'react-native/Libraries/vendor/emitter/EventSubscriptionVendor$':
    'react-native-web/dist/vendor/react-native/emitter/EventSubscriptionVendor',
  'react-native/Libraries/EventEmitter/NativeEventEmitter$':
    'react-native-web/dist/vendor/react-native/NativeEventEmitter',
};

const createFontLoader = require('./loaders/createFontLoader');
const createBabelLoader = require('./loaders/createBabelLoader');
const getConfig = require('./utils/getConfig');

// { production, development, mode, projectRoot }
module.exports = function(env = {}, argv = {}) {
  const {
    /**
     * **Dangerously** disable, extend, or clobber the default alias.
     *
     * Disable by passing in `alias: false`
     * Clobber with `alias: { ... }` setting existing `DEFAULT_ALIAS` values to `undefined`
     * Extend by defining new values in `alias: { ... }`
     */
    alias: aliasProp,
    publicPath = '/',
    /**
     * The project's `app.json`
     * This will be used to populate the `Constants.manifest` in the Unimodule `expo-constants`
     */
    expoConfig,
    /**
     * **Dangerously** disable the default font loading configuration.
     * If you are merging `webpack.config.unimodules` with another less flexible config,
     * you may want to disable font loading in favor of a manually defined loader.
     *
     * If you do this, be sure to include `@expo/vector-icons` & `react-native-vector-icons`
     * otherwise icons won't work as expected.
     */
    supportsFontLoading = true,
  } = argv;

  const config = expoConfig || getConfig(env);
  const alias = overrideWithPropertyOrConfig(aliasProp, DEFAULT_ALIAS, true);

  const locations = getPaths(env);
  const mode = getMode(env);

  const babelConfig = createBabelLoader({
    mode,
    babelProjectRoot: locations.root,
  });

  const publicAppManifest = createEnvironmentConstants(config, locations.production.manifest);

  const environmentVariables = createClientEnvironment(mode, publicPath, publicAppManifest);

  const loaders = [
    {
      test: /\.html$/,
      use: ['html-loader'],
      exclude: locations.template.folder,
    },
    // Process application JS with Babel.
    babelConfig,
  ];

  if (supportsFontLoading) {
    const fontLoaderConfiguration = createFontLoader({ locations });
    loaders.push(fontLoaderConfiguration);
  }

  return {
    // TODO: Bacon: It would be good not to define mode here. We currently need to for the env variables.
    mode,
    // configures where the build ends up
    output: {
      // This is the URL that app is served from.
      // We use "/" in development.
      publicPath,
    },
    plugins: [
      // Generate a manifest file which contains a mapping of all asset filenames
      // to their corresponding output file so that tools can pick it up without
      // having to parse `index.html`.
      new ManifestPlugin({
        fileName: 'asset-manifest.json',
        publicPath,
      }),
      /**
       * Required for `expo-constants` https://docs.expo.io/versions/latest/sdk/constants/
       * This surfaces the `app.json` (config) as an environment variable which is then parsed by `expo-constants`.
       */
      new DefinePlugin(environmentVariables),
    ],
    module: {
      strictExportPresence: false,

      rules: loaders,
    },
    resolve: {
      symlinks: false,
      alias,
      extensions: [
        '.web.ts',
        '.web.tsx',
        '.ts',
        '.tsx',
        '.web.js',
        '.web.jsx',
        '.js',
        '.jsx',
        '.json',
      ],
    },
  };
};
