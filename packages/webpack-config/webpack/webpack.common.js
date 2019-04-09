const HtmlWebpackPlugin = require('html-webpack-plugin');
const ProgressBarPlugin = require('progress-bar-webpack-plugin');
const webpack = require('webpack');
const InterpolateHtmlPlugin = require('react-dev-utils/InterpolateHtmlPlugin');
const ManifestPlugin = require('webpack-manifest-plugin');
const WorkboxPlugin = require('workbox-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const WebpackDeepScopeAnalysisPlugin = require('webpack-deep-scope-plugin').default;
const chalk = require('chalk');
const getLocations = require('./webpackLocations');
const createIndexHTMLFromAppJSON = require('./createIndexHTMLFromAppJSON');
const createClientEnvironment = require('./createClientEnvironment');
const createBabelConfig = require('./createBabelConfig');
const { overrideWithPropertyOrConfig } = require('./utils/config');

// Use root to work better with create-react-app
const DEFAULT_ROOT_ID = `root`;
const DEFAULT_LANGUAGE_ISO_CODE = `en`;
const DEFAULT_NO_JS_MESSAGE = `Oh no! It looks like JavaScript is not enabled in your browser.`;
const DEFAULT_NAME = 'Expo App';
const DEFAULT_THEME_COLOR = '#4630EB';
const DEFAULT_DESCRIPTION = 'A Neat Expo App';

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

function sanitizePublicPath(publicPath) {
  if (typeof publicPath !== 'string' || !publicPath.length) {
    return '/';
  }
  if (publicPath.endsWith('/')) {
    return publicPath;
  }
  return publicPath + '/';
}

function stripSensitiveConstantsFromAppManifest(appManifest, pwaManifestLocation) {
  let web;
  try {
    web = require(pwaManifestLocation);
  } catch (e) {
    web = {};
  }

  return {
    /**
     * Omit app.json properties that get removed during the native turtle build
     *
     * `facebookScheme`
     * `facebookAppId`
     * `facebookDisplayName`
     */
    name: appManifest.displayName || appManifest.name,
    description: appManifest.description,
    slug: appManifest.slug,
    sdkVersion: appManifest.sdkVersion,
    version: appManifest.version,
    githubUrl: appManifest.githubUrl,
    orientation: appManifest.orientation,
    primaryColor: appManifest.primaryColor,
    privacy: appManifest.privacy,
    icon: appManifest.icon,
    scheme: appManifest.scheme,
    notification: appManifest.notification,
    splash: appManifest.splash,
    androidShowExponentNotificationInShellApp:
      appManifest.androidShowExponentNotificationInShellApp,
    web,
  };
}

module.exports = function(env = {}) {
  const locations = getLocations(env.projectRoot);
  const babelConfig = createBabelConfig(locations.root);

  const appJSON = require(locations.appJson);
  if (!appJSON) {
    throw new Error('app.json could not be found at: ' + locations.appJson);
  }
  // For RN CLI support
  const appManifest = appJSON.expo || appJSON;
  const { web: webManifest = {} } = appManifest;

  // rn-cli apps use a displayName value as well.
  const appName =
    appJSON.displayName || appManifest.displayName || appManifest.name || DEFAULT_NAME;
  const webName = webManifest.name || appName;

  const languageISOCode = webManifest.lang || DEFAULT_LANGUAGE_ISO_CODE;
  const noJavaScriptMessage = webManifest.noJavaScriptMessage || DEFAULT_NO_JS_MESSAGE;
  const rootId = appManifest.rootId || DEFAULT_ROOT_ID;
  const noJSComponent = createNoJSComponent(noJavaScriptMessage);
  const publicPath = sanitizePublicPath(webManifest.publicPath);
  const primaryColor = appManifest.primaryColor || DEFAULT_THEME_COLOR;
  const description = appManifest.description || DEFAULT_DESCRIPTION;

  const processedAppManifest = {
    ...appManifest,
    name: appName,
    description,
    primaryColor,
    rootId,
    web: {
      ...webManifest,
      lang: languageISOCode,
      name: webName,
      noJavaScriptMessage,
      publicPath,
    },
  };

  const publicAppManifest = stripSensitiveConstantsFromAppManifest(
    processedAppManifest,
    locations.production.manifest
  );

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

  const serviceWorker = overrideWithPropertyOrConfig(
    webManifest.serviceWorker,
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
      createIndexHTMLFromAppJSON(processedAppManifest, locations),

      // Add variables to the `index.html`
      new InterpolateHtmlPlugin(HtmlWebpackPlugin, {
        PUBLIC_URL: publicPath,
        WEB_TITLE: webName,
        NO_SCRIPT: noJSComponent,
        LANG_ISO_CODE: languageISOCode,
        ROOT_ID: rootId,
      }),

      // Generate a manifest file which contains a mapping of all asset filenames
      // to their corresponding output file so that tools can pick it up without
      // having to parse `index.html`.
      new ManifestPlugin({
        fileName: 'asset-manifest.json',
        publicPath,
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
