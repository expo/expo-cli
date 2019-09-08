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
// @ts-ignore
const webpack_pwa_manifest_plugin_1 = __importDefault(require('@expo/webpack-pwa-manifest-plugin'));
// @ts-ignore
const html_webpack_plugin_1 = __importDefault(require('html-webpack-plugin'));
const InterpolateHtmlPlugin_1 = __importDefault(require('react-dev-utils/InterpolateHtmlPlugin'));
const webpack_1 = require('webpack');
const webpack_bundle_analyzer_1 = require('webpack-bundle-analyzer');
// @ts-ignore
const webpack_deep_scope_plugin_1 = __importDefault(require('webpack-deep-scope-plugin'));
const workbox_webpack_plugin_1 = __importDefault(require('workbox-webpack-plugin'));
// @ts-ignore
const clean_webpack_plugin_1 = __importDefault(require('clean-webpack-plugin'));
// @ts-ignore
const ModuleNotFoundPlugin_1 = __importDefault(require('react-dev-utils/ModuleNotFoundPlugin'));
// @ts-ignore
const pnp_webpack_plugin_1 = __importDefault(require('pnp-webpack-plugin'));
const ModuleScopePlugin_1 = __importDefault(require('react-dev-utils/ModuleScopePlugin'));
const webpack_manifest_plugin_1 = __importDefault(require('webpack-manifest-plugin'));
// @ts-ignore
const case_sensitive_paths_webpack_plugin_1 = __importDefault(
  require('case-sensitive-paths-webpack-plugin')
);
const WatchMissingNodeModulesPlugin_1 = __importDefault(
  require('react-dev-utils/WatchMissingNodeModulesPlugin')
);
// @ts-ignore
const mini_css_extract_plugin_1 = __importDefault(require('mini-css-extract-plugin'));
// @ts-ignore
const compression_webpack_plugin_1 = __importDefault(require('compression-webpack-plugin'));
// @ts-ignore
const brotli_webpack_plugin_1 = __importDefault(require('brotli-webpack-plugin'));
const copy_webpack_plugin_1 = __importDefault(require('copy-webpack-plugin'));
const createIndexHTMLFromAppJSONAsync_1 = __importDefault(
  require('./createIndexHTMLFromAppJSONAsync')
);
const getPathsAsync_1 = __importDefault(require('./utils/getPathsAsync'));
const plugins_1 = require('./plugins');
const config_1 = require('./utils/config');
const createFontLoader_1 = __importDefault(require('./loaders/createFontLoader'));
const createBabelLoaderAsync_1 = __importDefault(require('./loaders/createBabelLoaderAsync'));
const getMode_1 = __importDefault(require('./utils/getMode'));
const getConfigAsync_1 = __importDefault(require('./utils/getConfigAsync'));
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
  verbose: false,
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
    loader: require.resolve('url-loader'),
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
function getDevtool({ production, development }, { devtool }) {
  if (production) {
    // string or false
    if (devtool !== undefined) {
      // When big assets are involved sources maps can become expensive and cause your process to run out of memory.
      return devtool;
    }
    return 'source-map';
  }
  if (development) {
    return 'cheap-module-source-map';
  }
  return false;
}
function default_1(env, argv) {
  return __awaiter(this, void 0, void 0, function*() {
    const config = yield getConfigAsync_1.default(env);
    const mode = getMode_1.default(env);
    const isDev = mode === 'development';
    const isProd = mode === 'production';
    const { platform = 'web' } = env;
    // Enables deep scope analysis in production mode.
    // Remove unused import/exports
    // override: `env.removeUnusedImportExports`
    const deepScopeAnalysisEnabled = config_1.overrideWithPropertyOrConfig(
      env.removeUnusedImportExports,
      false
      // isProd
    );
    const locations = yield getPathsAsync_1.default(env);
    // Webpack uses `publicPath` to determine where the app is being served from.
    // It requires a trailing slash, or the file assets will get an incorrect path.
    // In development, we always serve from the root. This makes config easier.
    const publicPath = isProd ? locations.servedPath : '/';
    // `publicUrl` is just like `publicPath`, but we will provide it to our app
    // as %WEB_PUBLIC_URL% in `index.html` and `process.env.WEB_PUBLIC_URL` in JavaScript.
    // Omit trailing slash as %WEB_PUBLIC_URL%/xyz looks better than %WEB_PUBLIC_URL%xyz.
    const publicUrl = isProd ? publicPath.slice(0, -1) : '';
    const middlewarePlugins = [];
    const { build: buildConfig } = config.web;
    const { lang } = config.web;
    const { rootId, babel: babelAppConfig = {} } = config.web.build;
    const { noJavaScriptMessage } = config.web.dangerous;
    const noJSComponent = createNoJSComponent(noJavaScriptMessage);
    if (deepScopeAnalysisEnabled) {
      // @ts-ignore
      middlewarePlugins.push(new webpack_deep_scope_plugin_1.default());
    }
    const serviceWorker = config_1.overrideWithPropertyOrConfig(
      // Prevent service worker in development mode
      config.web.build.serviceWorker,
      DEFAULT_SERVICE_WORKER
    );
    if (serviceWorker) {
      // Generate a service worker script that will precache, and keep up to date,
      // the HTML & assets that are part of the Webpack build.
      middlewarePlugins.push(
        new workbox_webpack_plugin_1.default.GenerateSW(
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
              navigateFallback: `${publicUrl}/index.html`,
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
        )
      );
    }
    /**
     * report: {
     *   verbose: false,
     *   path: "web-report",
     *   statsFilename: "stats.json",
     *   reportFilename: "report.html"
     * }
     */
    let reportPlugins = [];
    const reportConfig = config_1.enableWithPropertyOrConfig(
      env.report,
      DEFAULT_REPORT_CONFIG,
      true
    );
    if (typeof config.web.build.report !== 'undefined') {
      throw new Error(
        'expo.web.build.report is deprecated. Please extend webpack.config.js and use env.report instead.'
      );
    }
    if (reportConfig) {
      if (isDev && reportConfig.verbose) {
        console.log('Generating a report, this will add noticeably more time to rebuilds.');
      }
      const reportDir = reportConfig.path;
      reportPlugins = [
        // Delete the report folder
        new clean_webpack_plugin_1.default([locations.absolute(reportDir)], {
          root: locations.root,
          dry: false,
          verbose: reportConfig.verbose,
        }),
        // Generate the report.html and stats.json
        new webpack_bundle_analyzer_1.BundleAnalyzerPlugin(
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
        ),
      ];
    }
    const devtool = getDevtool({ production: isProd, development: isDev }, config.web.build);
    const babelProjectRoot = babelAppConfig.root || locations.root;
    const babelLoader = yield createBabelLoaderAsync_1.default({
      mode,
      platform,
      babelProjectRoot,
      verbose: babelAppConfig.verbose,
      include: babelAppConfig.include,
      use: babelAppConfig.use,
    });
    const allLoaders = [
      {
        test: /\.html$/,
        use: [require.resolve('html-loader')],
        exclude: locations.template.folder,
      },
      imageLoaderConfiguration,
      babelLoader,
      createFontLoader_1.default({ locations }),
      {
        test: /\.(css)$/,
        use: [require.resolve('style-loader'), require.resolve('css-loader')],
      },
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
      isProd && config_1.overrideWithPropertyOrConfig(buildConfig.gzip, DEFAULT_GZIP);
    const brotliConfig =
      isProd && config_1.enableWithPropertyOrConfig(buildConfig.brotli, DEFAULT_BROTLI);
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
        // Build folder (default `web-build`)
        path: locations.production.folder,
        sourceMapFilename: '[chunkhash].map',
        // We inferred the "public path" (such as / or /my-project) from homepage.
        // We use "/" in development.
        publicPath,
      },
      plugins: [
        // Delete the build folder
        isProd &&
          new clean_webpack_plugin_1.default([locations.production.folder], {
            root: locations.root,
            dry: false,
            verbose: false,
          }),
        // Copy the template files over
        isProd &&
          new copy_webpack_plugin_1.default([
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
          ]),
        // Generate the `index.html`
        yield createIndexHTMLFromAppJSONAsync_1.default(env),
        // Add variables to the `index.html`
        new InterpolateHtmlPlugin_1.default(html_webpack_plugin_1.default, {
          WEB_PUBLIC_URL: publicPath,
          WEB_TITLE: config.web.name,
          NO_SCRIPT: noJSComponent,
          LANG_ISO_CODE: lang,
          ROOT_ID: rootId,
        }),
        new webpack_pwa_manifest_plugin_1.default(config, {
          publicPath,
          noResources: isDev || !env.pwa,
          filename: locations.production.manifest,
          HtmlWebpackPlugin: html_webpack_plugin_1.default,
        }),
        // This gives some necessary context to module not found errors, such as
        // the requesting resource.
        new ModuleNotFoundPlugin_1.default(locations.root),
        new plugins_1.ExpoDefinePlugin({
          mode,
          publicUrl,
          config,
          productionManifestPath: locations.production.manifest,
        }),
        // This is necessary to emit hot updates (currently CSS only):
        isDev && new webpack_1.HotModuleReplacementPlugin(),
        // Watcher doesn't work well if you mistype casing in a path so we use
        // a plugin that prints an error when you attempt to do this.
        // See https://github.com/facebook/create-react-app/issues/240
        isDev && new case_sensitive_paths_webpack_plugin_1.default(),
        // If you require a missing module and then `npm install` it, you still have
        // to restart the development server for Webpack to discover it. This plugin
        // makes the discovery automatic so you don't have to restart.
        // See https://github.com/facebook/create-react-app/issues/186
        isDev && new WatchMissingNodeModulesPlugin_1.default(locations.modules),
        isProd &&
          new mini_css_extract_plugin_1.default({
            // Options similar to the same options in webpackOptions.output
            // both options are optional
            filename: 'static/css/[name].[contenthash:8].css',
            chunkFilename: 'static/css/[name].[contenthash:8].chunk.css',
          }),
        // Generate a manifest file which contains a mapping of all asset filenames
        // to their corresponding output file so that tools can pick it up without
        // having to parse `index.html`.
        new webpack_manifest_plugin_1.default({
          fileName: 'asset-manifest.json',
          publicPath,
        }),
        ...middlewarePlugins,
        gzipConfig && new compression_webpack_plugin_1.default(gzipConfig),
        brotliConfig && new brotli_webpack_plugin_1.default(brotliConfig),
        new plugins_1.ExpoProgressBarPlugin(),
        ...reportPlugins,
      ].filter(Boolean),
      module: {
        strictExportPresence: false,
        rules: [
          // Disable require.ensure because it breaks tree shaking.
          { parser: { requireEnsure: false } },
          {
            oneOf: allLoaders,
          },
        ].filter(Boolean),
      },
      resolveLoader: {
        plugins: [
          // Also related to Plug'n'Play, but this time it tells Webpack to load its loaders
          // from the current package.
          pnp_webpack_plugin_1.default.moduleLoader(module),
        ],
      },
      resolve: {
        alias: config_1.DEFAULT_ALIAS,
        extensions: config_1.getModuleFileExtensions('web'),
        plugins: [
          // Adds support for installing with Plug'n'Play, leading to faster installs and adding
          // guards against forgotten dependencies and such.
          pnp_webpack_plugin_1.default,
          // Prevents users from importing files from outside of node_modules/.
          // This often causes confusion because we only process files within the root folder with babel.
          // To fix this, we prevent you from importing files out of the root folder -- if you'd like to,
          // please link the files into your node_modules/ and let module-resolution kick in.
          // Make sure your source files are compiled, as they will not be processed in any way.
          new ModuleScopePlugin_1.default(babelProjectRoot, [locations.packageJson]),
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
    };
  });
}
exports.default = default_1;
//# sourceMappingURL=webpack.common.js.map
