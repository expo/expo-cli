'use strict';
var __awaiter =
  (this && this.__awaiter) ||
  function(thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : new P(function(resolve) {
              resolve(result.value);
            }).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const config_1 = require('@expo/config');
const webpack_1 = require('webpack');
const webpack_manifest_plugin_1 = __importDefault(require('webpack-manifest-plugin'));
const createClientEnvironment_1 = __importDefault(require('./createClientEnvironment'));
const config_2 = require('./utils/config');
const getMode_1 = __importDefault(require('./utils/getMode'));
const getPathsAsync_1 = __importDefault(require('./utils/getPathsAsync'));
const createFontLoader_1 = __importDefault(require('./loaders/createFontLoader'));
const createBabelLoaderAsync_1 = __importDefault(require('./loaders/createBabelLoaderAsync'));
const getConfigAsync_1 = __importDefault(require('./utils/getConfigAsync'));
/**
 * A bare webpack config that is required for using
 * react-native-web & Unimodules in the browser.
 *
 * This should be used to inject basic support into systems
 * like react-scripts and storybook.
 */
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
// { production, development, mode, projectRoot }
function default_1(env, argv) {
  return __awaiter(this, void 0, void 0, function*() {
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
    const config = expoConfig || (yield getConfigAsync_1.default(env));
    const alias = config_2.overrideWithPropertyOrConfig(aliasProp, DEFAULT_ALIAS, true);
    const locations = yield getPathsAsync_1.default(env);
    const mode = getMode_1.default(env);
    const babelConfig = yield createBabelLoaderAsync_1.default({
      mode,
      babelProjectRoot: locations.root,
    });
    const publicAppManifest = config_1.createEnvironmentConstants(
      config,
      locations.production.manifest
    );
    const environmentVariables = createClientEnvironment_1.default(
      mode,
      publicPath,
      publicAppManifest
    );
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
      const fontLoaderConfiguration = createFontLoader_1.default({ locations });
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
        new webpack_manifest_plugin_1.default({
          fileName: 'asset-manifest.json',
          publicPath,
        }),
        /**
         * Required for `expo-constants` https://docs.expo.io/versions/latest/sdk/constants/
         * This surfaces the `app.json` (config) as an environment variable which is then parsed by `expo-constants`.
         */
        new webpack_1.DefinePlugin(environmentVariables),
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
  });
}
exports.default = default_1;
//# sourceMappingURL=webpack.config.unimodules.js.map
