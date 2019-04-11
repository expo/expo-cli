const { createEnvironmentConstants } = require('@expo/config');
const WebpackPWAManifestPlugin = require('@expo/webpack-pwa-manifest-plugin');
const chalk = require('chalk');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ProgressBarPlugin = require('progress-bar-webpack-plugin');
const InterpolateHtmlPlugin = require('react-dev-utils/InterpolateHtmlPlugin');
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const WebpackDeepScopeAnalysisPlugin = require('webpack-deep-scope-plugin').default;
const WorkboxPlugin = require('workbox-webpack-plugin');
const createClientEnvironment = require('./createClientEnvironment');
const createIndexHTMLFromAppJSON = require('./createIndexHTMLFromAppJSON');
const { overrideWithPropertyOrConfig } = require('./utils/config');
const getLocations = require('./webpackLocations');

const DEFAULT_SERVICE_WORKER = {};

// This is needed for webpack to import static images in JavaScript files.
const imageLoaderConfiguration = {
  test: /\.(gif|jpe?g|png|svg)$/,
  use: {
    loader: 'url-loader',
    // loader: 'file-loader',
    options: {
      // Inline resources as Base64 when there is less reason to parallelize their download. The
      // heuristic we use is whether the resource would fit within a TCP/IP packet that we would
      // send to request the resource.
      //
      // An Ethernet MTU is usually 1500. IP headers are 20 (v4) or 40 (v6) bytes and TCP
      // headers are 40 bytes. HTTP response headers vary and are around 400 bytes. This leaves
      // about 1000 bytes for content to fit in a packet.
      limit: 1000,
      name: 'static/media/[hash].[ext]',
    },
  },
};

const mediaLoaderConfiguration = {
  test: /\.(mov|mp4|mp3|wav|webm|db)$/,
  use: [
    {
      loader: 'file-loader',
      options: {
        name: 'static/assets/[path][name].[ext]',
      },
    },
  ],
};

const styleLoaderConfiguration = {
  test: /\.(css)$/,
  use: ['style-loader', 'css-loader'],
};

function createNoJSComponent(message) {
  // from twitter.com
  return `" <form action="" method="POST" style="background-color:#fff;position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;"><div style="font-size:18px;font-family:Helvetica,sans-serif;line-height:24px;margin:10%;width:80%;"> <p>${message}</p> <p style="margin:20px 0;"> <button type="submit" style="background-color: #4630EB; border-radius: 100px; border: none; box-shadow: none; color: #fff; cursor: pointer; font-size: 14px; font-weight: bold; line-height: 20px; padding: 6px 16px;">Ok</button> </p> </div> </form> "`;
}

module.exports = function(env = {}, argv) {
  const locations = getLocations(env.projectRoot);
  // const babelConfig = createBabelConfig(locations.root);
  const { babelConfig, config } = env;
  const publicAppManifest = createEnvironmentConstants(config, locations.production.manifest);

  const ttfLoaderConfiguration = {
    test: /\.(ttf|otf|woff)$/,
    use: [
      {
        loader: 'url-loader',
        options: {
          limit: 50000,
          name: './fonts/[name].[ext]',
        },
      },
    ],
    include: [
      locations.root,
      locations.includeModule('react-native-vector-icons'),
      locations.includeModule('@expo/vector-icons'),
    ],
  };

  const htmlLoaderConfiguration = {
    test: /\.html$/,
    use: ['html-loader'],
    exclude: locations.template.folder,
  };

  const middlewarePlugins = [
    // Remove unused import/exports
    new WebpackDeepScopeAnalysisPlugin(),
  ];

  const { publicPath, rootId, noJavaScriptMessage, lang } = config.web;
  const noJSComponent = createNoJSComponent(noJavaScriptMessage);

  const serviceWorker = overrideWithPropertyOrConfig(
    config.web.serviceWorker,
    DEFAULT_SERVICE_WORKER
  );
  if (serviceWorker) {
    middlewarePlugins.push(
      new WorkboxPlugin.GenerateSW({
        exclude: [/\.LICENSE$/, /\.map$/, /asset-manifest\.json$/],
        navigateFallback: `${publicPath}index.html`,
        ...serviceWorker,
      })
    );
  }

  return {
    context: __dirname,
    // configures where the build ends up
    output: {
      path: locations.production.folder,
      filename: 'static/[chunkhash].js',
      sourceMapFilename: '[chunkhash].map',
      // There are also additional JS chunk files if you use code splitting.
      chunkFilename: 'static/[id].[chunkhash].js',
      // This is the URL that app is served from. We use "/" in development.
      publicPath,
    },
    plugins: [
      // Generate the `index.html`
      createIndexHTMLFromAppJSON(config, locations),

      // Add variables to the `index.html`
      new InterpolateHtmlPlugin(HtmlWebpackPlugin, {
        PUBLIC_URL: publicPath,
        WEB_TITLE: config.web.name,
        NO_SCRIPT: noJSComponent,
        LANG_ISO_CODE: lang,
        ROOT_ID: rootId,
      }),

      // Generate the `manifest.json`
      new WebpackPWAManifestPlugin(config, {
        ...env,
        filename: locations.production.manifest,
      }),

      new webpack.DefinePlugin(createClientEnvironment(locations, publicPath, publicAppManifest)),

      ...middlewarePlugins,

      new ProgressBarPlugin({
        format: '  build [:bar] ' + chalk.green.bold(':percent') + ' (:elapsed seconds) :msg',
        clear: false,
      }),

      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: false,
      }),
    ],

    module: {
      strictExportPresence: false,

      rules: [
        { parser: { requireEnsure: false } },

        htmlLoaderConfiguration,
        babelConfig,
        imageLoaderConfiguration,
        ttfLoaderConfiguration,
        mediaLoaderConfiguration,
        styleLoaderConfiguration,
      ],
    },
    resolve: {
      symlinks: false,
      extensions: ['.web.ts', '.ts', '.tsx', '.web.js', '.js', '.jsx', '.json'],
      alias: {
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
      },
    },
    // Some libraries import Node modules but don't use them in the browser.
    // Tell Webpack to provide empty mocks for them so importing them works.
    node: {
      dgram: 'empty',
      fs: 'empty',
      net: 'empty',
      tls: 'empty',
      child_process: 'empty',
    },
    // Turn off performance processing because we utilize
    // our own hints via the FileSizeReporter
    performance: false,
  };
};
