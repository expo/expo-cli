const HtmlWebpackPlugin = require('html-webpack-plugin');
const ProgressBarPlugin = require('progress-bar-webpack-plugin');
const webpack = require('webpack');
const InterpolateHtmlPlugin = require('react-dev-utils/InterpolateHtmlPlugin');
const ManifestPlugin = require('webpack-manifest-plugin');
const WorkboxPlugin = require('workbox-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const WebpackDeepScopeAnalysisPlugin = require('webpack-deep-scope-plugin').default;
const WebpackPWAManifestPlugin = require('@expo/webpack-pwa-manifest-plugin');
const chalk = require('chalk');
const getLocations = require('./webpackLocations');
const createIndexHTMLFromAppJSON = require('./createIndexHTMLFromAppJSON');
const createClientEnvironment = require('./createClientEnvironment');
const createBabelConfig = require('./createBabelConfig');

// To work with the iPhone X "notch" add `viewport-fit=cover` to the `viewport` meta tag.
const DEFAULT_VIEWPORT = 'width=device-width,initial-scale=1,minimum-scale=1,viewport-fit=cover';
// Use root to work better with create-react-app
const DEFAULT_ROOT_ID = `root`;
const DEFAULT_LANGUAGE_ISO_CODE = `en`;
const DEFAULT_NO_JS_MESSAGE = `Oh no! It looks like JavaScript is not enabled in your browser.`;
const DEFAULT_NAME = 'Expo App';
const DEFAULT_THEME_COLOR = '#4630EB';
const DEFAULT_DESCRIPTION = 'A Neat Expo App';
const DEFAULT_BACKGROUND_COLOR = '#ffffff';
const DEFAULT_START_URL = '.';
const DEFAULT_DISPLAY = 'fullscreen';
const DEFAULT_STATUS_BAR = 'default';
const DEFAULT_LANG_DIR = 'auto';
const DEFAULT_ORIENTATION = 'any';
const ICON_SIZES = [96, 128, 192, 256, 384, 512];
const MAX_SHORT_NAME_LENGTH = 12;

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
    return '';
  }
  return publicPath.replace(/\/$/, '');
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
  const { web: webManifest = {}, splash = {}, ios = {}, android = {} } = appManifest;

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
  // The theme_color sets the color of the tool bar, and may be reflected in the app's preview in task switchers.
  const webThemeColor = webManifest.themeColor || webManifest.theme_color || primaryColor;
  const dir = webManifest.dir || DEFAULT_LANG_DIR;
  const shortName = webManifest.shortName || webManifest.short_name || webName;
  const display = webManifest.display || DEFAULT_DISPLAY;
  const startUrl = webManifest.startUrl || webManifest.start_url || DEFAULT_START_URL;
  const webViewport = webManifest.viewport || DEFAULT_VIEWPORT;
  /**
   * https://developer.mozilla.org/en-US/docs/Web/Manifest#prefer_related_applications
   * Specifies a boolean value that hints for the user agent to indicate
   * to the user that the specified native applications (see below) are recommended over the website.
   * This should only be used if the related native apps really do offer something that the website can't... like Expo ;)
   */

  const preferRelatedApplications =
    webManifest.preferRelatedApplications || webManifest.prefer_related_applications;

  const barStyle =
    webManifest.barStyle ||
    webManifest['apple-mobile-web-app-status-bar-style'] ||
    DEFAULT_STATUS_BAR;

  let webOrientation = webManifest.orientation || appManifest.orientation;
  if (webOrientation && typeof orientation === 'string') {
    webOrientation = webOrientation.toLowerCase();
    // Convert expo value to PWA value
    if (webOrientation === 'default') {
      webOrientation = DEFAULT_ORIENTATION;
    }
  } else {
    webOrientation = DEFAULT_ORIENTATION;
  }

  /**
   * **Splash screen background color**
   * `https://developers.google.com/web/fundamentals/web-app-manifest/#splash-screen`
   * The background_color should be the same color as the load page,
   * to provide a smooth transition from the splash screen to your app.
   */
  const backgroundColor =
    webManifest.backgroundColor ||
    webManifest.background_color ||
    splash.backgroundColor ||
    DEFAULT_BACKGROUND_COLOR; // No default background color

  /**
   * https://developer.mozilla.org/en-US/docs/Web/Manifest#related_applications
   * An array of native applications that are installable by, or accessible to, the underlying platform
   * for example, a native Android application obtainable through the Google Play Store.
   * Such applications are intended to be alternatives to the
   * website that provides similar/equivalent functionality — like the native app version of the website.
   */
  let relatedApplications =
    webManifest.relatedApplications || webManifest.related_applications || [];

  // if the user manually defines this as false, then don't infer native apps.
  if (preferRelatedApplications !== false) {
    const noRelatedApplicationsDefined =
      Array.isArray(relatedApplications) && !relatedApplications.length;

    if (noRelatedApplicationsDefined) {
      if (ios.bundleIdentifier) {
        const alreadyHasIOSApp = relatedApplications.some(app => app.platform === 'itunes');
        if (!alreadyHasIOSApp) {
          const iosApp = {
            platform: 'itunes',
            url: ios.appStoreUrl,
            id: ios.bundleIdentifier,
          };
          relatedApplications.push(iosApp);
        }
      }
      if (android.package) {
        const alreadyHasAndroidApp = relatedApplications.some(app => app.platform === 'play');
        if (!alreadyHasAndroidApp) {
          let androidUrl = android.playStoreUrl;
          if (!androidUrl && android.package) {
            androidUrl = `http://play.google.com/store/apps/details?id=${android.package}`;
          }
          const androidApp = {
            platform: 'play',
            url: androidUrl,
            id: android.package,
          };
          relatedApplications.push(androidApp);
        }
      }
    }
  }

  let icons = [];
  let icon;
  if (webManifest.icon || appManifest.icon) {
    icon = locations.absolute(webManifest.icon || appManifest.icon);
  } else {
    // Use template icon
    icon = locations.template.get('icon.png');
  }
  icons.push({ src: icon, size: ICON_SIZES });
  let startupImages = [];
  const iOSIcon = appManifest.icon || ios.icon;
  if (iOSIcon) {
    const iOSIconPath = locations.absolute(iOSIcon);
    icons.push({
      ios: true,
      size: 1024,
      src: iOSIconPath,
    });

    const { splash: iOSSplash = {} } = ios;
    let splashImageSource = iOSIconPath;
    if (iOSSplash.image || splash.image) {
      splashImageSource = locations.absolute(iOSSplash.image || splash.image);
    }
    startupImages.push({
      src: splashImageSource,
      supportsTablet: ios.supportsTablet,
      orientation: webOrientation,
      destination: `assets/splash`,
    });
  }

  // Validate short name
  if (shortName.length > MAX_SHORT_NAME_LENGTH) {
    if (webManifest.shortName) {
      console.warn(
        `web.shortName should be 12 characters or less, otherwise it'll be curtailed on the mobile device homepage.`
      );
    } else {
      console.warn(
        `name should be 12 characters or less, otherwise it'll be curtailed on the mobile device homepage. You should define web.shortName in your app.json as a string that is ${MAX_SHORT_NAME_LENGTH} or less characters.`
      );
    }
  }

  const processedAppManifest = {
    ...appManifest,
    name: appName,
    description,
    primaryColor,
    rootId,
    web: {
      ...webManifest,
      viewport: webViewport,
      description,
      icons,
      startupImages,
      preferRelatedApplications,
      relatedApplications,
      startUrl,
      shortName,
      display,
      orientation: webOrientation,
      dir,
      barStyle,
      backgroundColor,
      themeColor: webThemeColor,
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

      // Generate the `manifest.json`
      new WebpackPWAManifestPlugin(processedAppManifest, {
        ...env,
        filename: locations.production.manifest,
      }),

      // Generate a manifest file which contains a mapping of all asset filenames
      // to their corresponding output file so that tools can pick it up without
      // having to parse `index.html`.
      new ManifestPlugin({
        fileName: 'asset-manifest.json',
        publicPath,
      }),

      new webpack.DefinePlugin(createClientEnvironment(locations, publicPath, publicAppManifest)),

      // Remove unused import/exports
      new WebpackDeepScopeAnalysisPlugin(),

      new WorkboxPlugin.GenerateSW({
        skipWaiting: true,
        clientsClaim: true,
        exclude: [/\.LICENSE$/, /\.map$/, /asset-manifest\.json$/],
        importWorkboxFrom: 'cdn',
        navigateFallback: `${publicPath}index.html`,
        navigateFallbackBlacklist: [new RegExp('^/_'), new RegExp('/[^/]+\\.[^/]+$')],
        runtimeCaching: [
          {
            urlPattern: /(.*?)/,
            handler: 'staleWhileRevalidate',
          },
        ],
      }),

      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: false,
      }),

      new ProgressBarPlugin({
        format: '  build [:bar] ' + chalk.green.bold(':percent') + ' (:elapsed seconds) :msg',
        clear: false,
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
      extensions: ['.web.js', '.js', '.jsx', '.json'],
      alias: {
        // Alias direct react-native imports to react-native-web
        'react-native$': 'react-native-web',
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
