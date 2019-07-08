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
const webpack_pwa_manifest_plugin_1 = __importDefault(require('@expo/webpack-pwa-manifest-plugin'));
const path_1 = __importDefault(require('path'));
const html_webpack_plugin_1 = __importDefault(require('html-webpack-plugin'));
const InterpolateHtmlPlugin_1 = __importDefault(require('react-dev-utils/InterpolateHtmlPlugin'));
const webpack_1 = require('webpack');
const webpack_bundle_analyzer_1 = require('webpack-bundle-analyzer');
const webpack_deep_scope_plugin_1 = __importDefault(require('webpack-deep-scope-plugin'));
const workbox_webpack_plugin_1 = __importDefault(require('workbox-webpack-plugin'));
const clean_webpack_plugin_1 = __importDefault(require('clean-webpack-plugin'));
const ModuleNotFoundPlugin_1 = __importDefault(require('react-dev-utils/ModuleNotFoundPlugin'));
const pnp_webpack_plugin_1 = __importDefault(require('pnp-webpack-plugin'));
const ModuleScopePlugin_1 = __importDefault(require('react-dev-utils/ModuleScopePlugin'));
const webpack_manifest_plugin_1 = __importDefault(require('webpack-manifest-plugin'));
const case_sensitive_paths_webpack_plugin_1 = __importDefault(
  require('case-sensitive-paths-webpack-plugin')
);
const WatchMissingNodeModulesPlugin_1 = __importDefault(
  require('react-dev-utils/WatchMissingNodeModulesPlugin')
);
const mini_css_extract_plugin_1 = __importDefault(require('mini-css-extract-plugin'));
const compression_webpack_plugin_1 = __importDefault(require('compression-webpack-plugin'));
const brotli_webpack_plugin_1 = __importDefault(require('brotli-webpack-plugin'));
const copy_webpack_plugin_1 = __importDefault(require('copy-webpack-plugin'));
const webpack_notifier_1 = __importDefault(require('webpack-notifier'));
const speed_measure_webpack_plugin_1 = __importDefault(require('speed-measure-webpack-plugin'));
const createIndexHTMLFromAppJSONAsync_1 = __importDefault(
  require('./createIndexHTMLFromAppJSONAsync')
);
const createClientEnvironment_1 = __importDefault(require('./createClientEnvironment'));
const getPathsAsync_1 = __importDefault(require('./utils/getPathsAsync'));
const config_2 = require('./utils/config');
const createFontLoader_1 = __importDefault(require('./loaders/createFontLoader'));
const createBabelLoaderAsync_1 = __importDefault(require('./loaders/createBabelLoaderAsync'));
const getMode_1 = __importDefault(require('./utils/getMode'));
const getConfigAsync_1 = __importDefault(require('./utils/getConfigAsync'));
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
const DEFAULT_GZIP = {
  test: /\.(js|css)$/,
  filename: '[path].gz[query]',
  algorithm: 'gzip',
  threshold: 1024,
  minRatio: 0.8,
};
const DEFAULT_BROTLI = {
  asset: '[path].br[query]',
  test: /\.(js|css)$/,
  threshold: 1024,
  minRatio: 0.8,
};
const DEFAULT_SERVICE_WORKER = {};
const DEFAULT_REPORT_CONFIG = {
  verbose: true,
  path: 'web-report',
  statsFilename: 'stats.json',
  reportFilename: 'report.html',
};
// This is needed for webpack to import static images in JavaScript files.
// "url" loader works like "file" loader except that it embeds assets
// smaller than specified limit in bytes as data URLs to avoid requests.
// A missing `test` is equivalent to a match.
// TODO: Bacon: Move SVG
const imageLoaderConfiguration = {
  test: /\.(gif|jpe?g|png|svg)$/,
  use: {
    loader: 'url-loader',
    options: {
      // Inline resources as Base64 when there is less reason to parallelize their download. The
      // heuristic we use is whether the resource would fit within a TCP/IP packet that we would
      // send to request the resource.
      //
      // An Ethernet MTU is usually 1500. IP headers are 20 (v4) or 40 (v6) bytes and TCP
      // headers are 40 bytes. HTTP response headers vary and are around 400 bytes. This leaves
      // about 1000 bytes for content to fit in a packet.
      limit: 1000,
      name: 'static/media/[name].[hash:8].[ext]',
    },
  },
};
const styleLoaderConfiguration = {
  test: /\.(css)$/,
  use: ['style-loader', 'css-loader'],
};
// "file" loader makes sure those assets get served by WebpackDevServer.
// When you `import` an asset, you get its (virtual) filename.
// In production, they would get copied to the `build` folder.
// This loader doesn't use a "test" so it will catch all modules
// that fall through the other loaders.
const fallbackLoaderConfiguration = {
  loader: require.resolve('file-loader'),
  // Exclude `js` files to keep "css" loader working as it injects
  // its runtime that would otherwise be processed through "file" loader.
  // Also exclude `html` and `json` extensions so they get processed
  // by webpacks internal loaders.
  // Excludes: js, jsx, ts, tsx, html, json
  exclude: [/\.jsx?$/, /\.tsx?$/, /\.html$/, /\.json$/],
  options: {
    name: 'static/media/[name].[hash:8].[ext]',
  },
};
function createNoJSComponent(message) {
  // from twitter.com
  return `" <form action="location.reload()" method="POST" style="background-color:#fff;position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;"><div style="font-size:18px;font-family:Helvetica,sans-serif;line-height:24px;margin:10%;width:80%;"> <p>${message}</p> <p style="margin:20px 0;"> <button type="submit" style="background-color: #4630EB; border-radius: 100px; border: none; box-shadow: none; color: #fff; cursor: pointer; font-size: 14px; font-weight: bold; line-height: 20px; padding: 6px 16px;">Reload</button> </p> </div> </form> "`;
}
function getDevtool(env, devtool) {
  if (env.production) {
    // string or false
    if (devtool !== undefined) {
      // When big assets are involved sources maps can become expensive and cause your process to run out of memory.
      return devtool;
    }
    return 'source-map';
  }
  if (env.development) {
    return 'cheap-module-source-map';
  }
  return false;
}
function default_1(env = {}, argv) {
  return __awaiter(this, void 0, void 0, function*() {
    const config = yield getConfigAsync_1.default(env);
    const mode = getMode_1.default(env);
    const isDev = mode === 'development';
    const isProd = mode === 'production';
    let pluginNames = {};
    // Enables deep scope analysis in production mode.
    // Remove unused import/exports
    // override: `env.deepScopeAnalysis`
    const deepScopeAnalysisEnabled = config_2.overrideWithPropertyOrConfig(
      env.removeUnusedImportExports,
      isProd
    );
    const locations = yield getPathsAsync_1.default(env);
    const publicAppManifest = config_1.createEnvironmentConstants(
      config,
      locations.production.manifest
    );
    // const middlewarePlugins = [];
    const { build: buildConfig } = config.web;
    const { lang } = config.web;
    const { publicPath, rootId, babel: babelAppConfig = {} } = config.web.build;
    const { noJavaScriptMessage } = config.web.dangerous;
    const noJSComponent = createNoJSComponent(noJavaScriptMessage);
    /**
     * report: {
     *   verbose: false,
     *   path: "web-report",
     *   statsFilename: "stats.json",
     *   reportFilename: "report.html"
     * }
     */
    let reportPlugins = [];
    const devtool = getDevtool(env, config.web.build.devtool);
    const allLoaders = [
      {
        test: /\.html$/,
        use: ['html-loader'],
        exclude: locations.template.folder,
      },
      imageLoaderConfiguration,
      yield createBabelLoaderAsync_1.default({
        mode,
        babelProjectRoot: babelAppConfig.root || locations.root,
        verbose: babelAppConfig.verbose,
        include: babelAppConfig.include,
        use: babelAppConfig.use,
      }),
      createFontLoader_1.default({ locations }),
      styleLoaderConfiguration,
      // This needs to be the last loader
      fallbackLoaderConfiguration,
    ].filter(Boolean);
    /**
     * web: {
     *   build: {
     *     verbose: boolean,
     *     brotli: boolean | {}, // (Brotli Options)
     *     gzip: boolean | CompressionPlugin.Options<O>,
     *   }
     * }
     */
    const gzipConfig =
      isProd && config_2.overrideWithPropertyOrConfig(buildConfig.gzip, DEFAULT_GZIP);
    const brotliConfig =
      isProd && config_2.enableWithPropertyOrConfig(buildConfig.brotli, DEFAULT_BROTLI);
    const appEntry = [locations.appMain];
    if (isProd) {
      if (env.polyfill) {
        appEntry.unshift('@babel/polyfill');
      }
    } else {
      // https://github.com/facebook/create-react-app/blob/e59e0920f3bef0c2ac47bbf6b4ff3092c8ff08fb/packages/react-scripts/config/webpack.config.js#L144
      // Include an alternative client for WebpackDevServer. A client's job is to
      // connect to WebpackDevServer by a socket and get notified about changes.
      // When you save a file, the client will either apply hot updates (in case
      // of CSS changes), or refresh the page (in case of JS changes). When you
      // make a syntax error, this client will display a syntax error overlay.
      // Note: instead of the default WebpackDevServer client, we use a custom one
      // to bring better experience for Create React App users. You can replace
      // the line below with these two lines if you prefer the stock client:
      // require.resolve('webpack-dev-server/client') + '?/',
      // require.resolve('webpack/hot/dev-server'),
      appEntry.unshift(require.resolve('react-dev-utils/webpackHotDevClient'));
    }
    const environmentVariables = createClientEnvironment_1.default(
      mode,
      publicPath,
      publicAppManifest
    );
    if (isProd) {
      // Delete the build folder
      pluginNames['Delete existing build folder'] = new clean_webpack_plugin_1.default(
        [locations.production.folder],
        {
          root: locations.root,
          dry: false,
          verbose: buildConfig.verbose,
        }
      );
      // Copy the template files over
      pluginNames[
        'Create a new build folder and copy template files'
      ] = new copy_webpack_plugin_1.default([
        {
          from: locations.template.folder,
          to: locations.production.folder,
          // We generate new versions of these based on the templates
          ignore: ['favicon.ico', 'serve.json', 'index.html', 'icon.png'],
        },
        {
          from: locations.template.serveJson,
          to: locations.production.serveJson,
        },
        {
          from: locations.template.favicon,
          to: locations.production.favicon,
        },
      ]);
    }
    // Generate the `index.html`
    pluginNames['Generating the index.html'] = yield createIndexHTMLFromAppJSONAsync_1.default(env);
    // Add variables to the `index.html`
    const interpolateHtmlPlugin = new InterpolateHtmlPlugin_1.default(
      html_webpack_plugin_1.default,
      {
        PUBLIC_URL: publicPath,
        WEB_TITLE: config.web.name,
        NO_SCRIPT: noJSComponent,
        LANG_ISO_CODE: lang,
        ROOT_ID: rootId,
      }
    );
    pluginNames['Interpolate HTML'] = interpolateHtmlPlugin;
    pluginNames['Create the PWA'] = new webpack_pwa_manifest_plugin_1.default(config, {
      publicPath,
      noResources: isDev || !env.pwa,
      filename: locations.production.manifest,
      HtmlWebpackPlugin: html_webpack_plugin_1.default,
    });
    // This gives some necessary context to module not found errors, such as
    // the requesting resource.
    pluginNames['Adding resource errors'] = new ModuleNotFoundPlugin_1.default(locations.root);
    pluginNames['Creating environment variables'] = new webpack_1.DefinePlugin(
      environmentVariables
    );
    if (isDev) {
      // This is necessary to emit hot updates (currently CSS only):
      pluginNames['Hot module replacement'] = new webpack_1.HotModuleReplacementPlugin();
      // Watcher doesn't work well if you mistype casing in a path so we use
      // a plugin that prints an error when you attempt to do this.
      // See https://github.com/facebook/create-react-app/issues/240
      pluginNames['Case sensitive paths'] = new case_sensitive_paths_webpack_plugin_1.default();
      // If you require a missing module and then `npm install` it, you still have
      // to restart the development server for Webpack to discover it. This plugin
      // makes the discovery automatic so you don't have to restart.
      // See https://github.com/facebook/create-react-app/issues/186
      pluginNames['Watching missing node modules'] = new WatchMissingNodeModulesPlugin_1.default(
        locations.modules
      );
    }
    if (isProd)
      pluginNames['Performing CSS extraction'] = new mini_css_extract_plugin_1.default({
        // Options similar to the same options in webpackOptions.output
        // both options are optional
        filename: 'static/css/[name].[contenthash:8].css',
        chunkFilename: 'static/css/[name].[contenthash:8].chunk.css',
      });
    // Generate a manifest file which contains a mapping of all asset filenames
    // to their corresponding output file so that tools can pick it up without
    // having to parse `index.html`.
    pluginNames['Generating the asset manifest'] = new webpack_manifest_plugin_1.default({
      fileName: 'asset-manifest.json',
      publicPath,
    });
    if (deepScopeAnalysisEnabled) {
      const deepScope = new webpack_deep_scope_plugin_1.default();
      // middlewarePlugins.push(deepScope);
      pluginNames['Tree-Shaking'] = deepScope;
    }
    const serviceWorker = config_2.overrideWithPropertyOrConfig(
      // Prevent service worker in development mode
      config.web.build.serviceWorker,
      DEFAULT_SERVICE_WORKER
    );
    if (serviceWorker) {
      // Generate a service worker script that will precache, and keep up to date,
      // the HTML & assets that are part of the Webpack build.
      const serviceWorkerPlugin = new workbox_webpack_plugin_1.default.GenerateSW(
        Object.assign(
          {
            exclude: [
              /\.LICENSE$/,
              /\.map$/,
              /asset-manifest\.json$/,
              // Exclude all apple touch images as they are cached locally after the PWA is added.
              /^\bapple.*\.png$/,
            ],
            /// SINGLE PAGE:
            // navigateFallback: `${publicPath}index.html`,
            clientsClaim: true,
            importWorkboxFrom: 'cdn',
            navigateFallbackBlacklist: [
              // Exclude URLs starting with /_, as they're likely an API call
              new RegExp('^/_'),
              // Exclude URLs containing a dot, as they're likely a resource in
              // public/ and not a SPA route
              new RegExp('/[^/]+\\.[^/]+$'),
            ],
          },
          isDev
            ? {
                include: [],
              }
            : {},
          serviceWorker
        )
      );
      // middlewarePlugins.push(serviceWorkerPlugin);
      pluginNames['Service-Worker'] = serviceWorkerPlugin;
    }
    if (gzipConfig)
      pluginNames['GZip Compression'] = new compression_webpack_plugin_1.default(gzipConfig);
    if (brotliConfig)
      pluginNames['Brotli Compression'] = new brotli_webpack_plugin_1.default(brotliConfig);
    // pluginNames['Progress Bar'] = new ProgressBarPlugin({
    //   format:
    //     'Building Webpack bundle [:bar] ' + chalk.green.bold(':percent') + ' (:elapsed seconds) :msg',
    //   clear: false,
    //   complete: '=',
    //   incomplete: ' ',
    // });
    pluginNames['Webpack Notification'] = new webpack_notifier_1.default({
      title: 'Expo Web',
      contentImage: path_1.default.join(__dirname, '../web-default/icon.png'),
    });
    const reportConfig = config_2.enableWithPropertyOrConfig(
      config.web.build.report,
      DEFAULT_REPORT_CONFIG,
      true
    );
    if (reportConfig) {
      if (isDev && reportConfig.verbose) {
        console.log('Generating a report, this will add noticeably more time to rebuilds.');
      }
      const reportDir = reportConfig.path;
      const bundleAnalyzerPlugin = new webpack_bundle_analyzer_1.BundleAnalyzerPlugin(
        Object.assign(
          {
            analyzerMode: 'static',
            defaultSizes: 'gzip',
            generateStatsFile: true,
            openAnalyzer: false,
          },
          reportConfig,
          {
            logLevel: reportConfig.verbose ? 'info' : 'silent',
            statsFilename: locations.absolute(reportDir, reportConfig.statsFilename),
            reportFilename: locations.absolute(reportDir, reportConfig.reportFilename),
          }
        )
      );
      // Delete the report folder
      pluginNames['Delete old report'] = new clean_webpack_plugin_1.default(
        [locations.absolute(reportDir)],
        {
          root: locations.root,
          dry: false,
          verbose: reportConfig.verbose,
        }
      );
      // Generate the report.html and stats.json
      pluginNames['Analyze bundle'] = bundleAnalyzerPlugin;
    }
    const smp = new speed_measure_webpack_plugin_1.default({ pluginNames });
    // return smp.wrap(config);
    return {
      mode,
      entry: {
        app: appEntry,
      },
      // https://webpack.js.org/configuration/other-options/#bail
      // Fail out on the first error instead of tolerating it.
      bail: isProd,
      devtool,
      context: __dirname,
      // configures where the build ends up
      output: {
        path: locations.production.folder,
        sourceMapFilename: '[chunkhash].map',
        // This is the URL that app is served from. We use "/" in development.
        publicPath,
      },
      plugins: [...Object.values(pluginNames)].filter(Boolean),
      module: {
        strictExportPresence: false,
        rules: [
          // Disable require.ensure because it breaks tree shaking.
          { parser: { requireEnsure: false } },
          {
            oneOf: allLoaders,
          },
        ],
      },
      resolveLoader: {
        plugins: [
          // Also related to Plug'n'Play, but this time it tells Webpack to load its loaders
          // from the current package.
          pnp_webpack_plugin_1.default.moduleLoader(module),
        ],
      },
      resolve: {
        alias: DEFAULT_ALIAS,
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
        plugins: [
          // Adds support for installing with Plug'n'Play, leading to faster installs and adding
          // guards against forgotten dependencies and such.
          pnp_webpack_plugin_1.default,
          // Prevents users from importing files from outside of node_modules/.
          // This often causes confusion because we only process files within the root folder with babel.
          // To fix this, we prevent you from importing files out of the root folder -- if you'd like to,
          // please link the files into your node_modules/ and let module-resolution kick in.
          // Make sure your source files are compiled, as they will not be processed in any way.
          new ModuleScopePlugin_1.default(locations.template.folder, [locations.packageJson]),
        ],
        symlinks: false,
      },
      // Some libraries import Node modules but don't use them in the browser.
      // Tell Webpack to provide empty mocks for them so importing them works.
      node: {
        module: 'empty',
        dgram: 'empty',
        dns: 'mock',
        fs: 'empty',
        http2: 'empty',
        net: 'empty',
        tls: 'empty',
        child_process: 'empty',
      },
      // Turn off performance processing because we utilize
      // our own (CRA) hints via the FileSizeReporter
      performance: false,
    };
  });
}
exports.default = default_1;
//# sourceMappingURL=webpack.common.js.map
