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
const CleanWebpackPlugin = require('clean-webpack-plugin');
const ModuleNotFoundPlugin = require('react-dev-utils/ModuleNotFoundPlugin');
const PnpWebpackPlugin = require('pnp-webpack-plugin');
const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');
const createClientEnvironment = require('./createClientEnvironment');
const createIndexHTMLFromAppJSON = require('./createIndexHTMLFromAppJSON');
const { enableWithPropertyOrConfig, overrideWithPropertyOrConfig } = require('./utils/config');
const getPaths = require('./utils/getPaths');
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
  return `" <form action="" method="POST" style="background-color:#fff;position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;"><div style="font-size:18px;font-family:Helvetica,sans-serif;line-height:24px;margin:10%;width:80%;"> <p>${message}</p> <p style="margin:20px 0;"> <button type="submit" style="background-color: #4630EB; border-radius: 100px; border: none; box-shadow: none; color: #fff; cursor: pointer; font-size: 14px; font-weight: bold; line-height: 20px; padding: 6px 16px;">Ok</button> </p> </div> </form> "`;
}

function getDevtool(env, { devtool }) {
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

const getMode = require('./utils/getMode');
const getConfig = require('./utils/getConfig');
// const createFontLoader = require('./loaders/createFontLoader');
// const createBabelLoader = require('./loaders/createBabelLoader');
const webpackConfigUnimodules = require('./webpack.config.unimodules');
const merge = require('webpack-merge');

module.exports = function(env = {}, argv) {
  const config = getConfig(env);
  const mode = getMode(env);
  const locations = getPaths(env);
  const publicAppManifest = createEnvironmentConstants(config, locations.production.manifest);

  const middlewarePlugins = [
    // Remove unused import/exports
    new WebpackDeepScopeAnalysisPlugin(),
  ];

  const { lang } = config.web;
  const { publicPath, rootId } = config.web.build;
  const { noJavaScriptMessage } = config.web.dangerous;
  const noJSComponent = createNoJSComponent(noJavaScriptMessage);

  const serviceWorker = overrideWithPropertyOrConfig(
    // Prevent service worker in development mode
    env.production ? config.web.build.serviceWorker : false,
    DEFAULT_SERVICE_WORKER
  );
  if (serviceWorker) {
    // Generate a service worker script that will precache, and keep up to date,
    // the HTML & assets that are part of the Webpack build.
    middlewarePlugins.push(
      new WorkboxPlugin.GenerateSW({
        exclude: [/\.LICENSE$/, /\.map$/, /asset-manifest\.json$/],
        navigateFallback: `${publicPath}index.html`,
        clientsClaim: true,
        importWorkboxFrom: 'cdn',
        navigateFallbackBlacklist: [
          // Exclude URLs starting with /_, as they're likely an API call
          new RegExp('^/_'),
          // Exclude URLs containing a dot, as they're likely a resource in
          // public/ and not a SPA route
          new RegExp('/[^/]+\\.[^/]+$'),
        ],
        ...serviceWorker,
      })
    );
  }

  if (env.pwa) {
    // Generate the `manifest.json`
    middlewarePlugins.push(
      new WebpackPWAManifestPlugin(config, {
        ...env,
        publicPath,
        noResources: env.development,
        filename: locations.production.manifest,
      })
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

  const reportConfig = enableWithPropertyOrConfig(
    config.web.build.report,
    DEFAULT_REPORT_CONFIG,
    true
  );

  if (reportConfig) {
    const reportDir = reportConfig.path;
    reportPlugins = [
      // Delete the report folder
      new CleanWebpackPlugin([locations.absolute(reportDir)], {
        root: locations.root,
        dry: false,
        verbose: reportConfig.verbose,
      }),
      // Generate the report.html and stats.json
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        defaultSizes: 'gzip',
        generateStatsFile: true,
        openAnalyzer: false,
        ...reportConfig,
        logLevel: reportConfig.verbose ? 'info' : 'silent',
        statsFilename: locations.absolute(reportDir, reportConfig.statsFilename),
        reportFilename: locations.absolute(reportDir, reportConfig.reportFilename),
      }),
    ];
  }

  const devtool = getDevtool(env, config.web.build);

  const unimodulesConfig = webpackConfigUnimodules(env, argv);

  const allLoaders = [
    imageLoaderConfiguration,
    ...unimodulesConfig.module.rules,
    styleLoaderConfiguration,
    // This needs to be the last loader
    fallbackLoaderConfiguration,
  ];

  // Clear all loaders
  unimodulesConfig.module.rules = [];

  return merge(unimodulesConfig, {
    // https://webpack.js.org/configuration/other-options/#bail
    // Fail out on the first error instead of tolerating it.
    bail: mode === 'production',
    devtool,
    context: __dirname,
    // configures where the build ends up
    output: {
      path: locations.production.folder,
      sourceMapFilename: '[chunkhash].map',
      // This is the URL that app is served from. We use "/" in development.
      publicPath,
    },
    plugins: [
      // Generate the `index.html`
      createIndexHTMLFromAppJSON(env),

      // Add variables to the `index.html`
      new InterpolateHtmlPlugin(HtmlWebpackPlugin, {
        PUBLIC_URL: publicPath,
        WEB_TITLE: config.web.name,
        NO_SCRIPT: noJSComponent,
        LANG_ISO_CODE: lang,
        ROOT_ID: rootId,
      }),

      new webpack.DefinePlugin(createClientEnvironment(locations, publicPath, publicAppManifest)),

      ...middlewarePlugins,

      // This gives some necessary context to module not found errors, such as
      // the requesting resource.
      new ModuleNotFoundPlugin(locations.root),

      new ProgressBarPlugin({
        format:
          'Building Webpack bundle [:bar] ' +
          chalk.green.bold(':percent') +
          ' (:elapsed seconds) :msg',
        clear: false,
        complete: '=',
        incomplete: ' ',
      }),

      ...reportPlugins,
    ],

    module: {
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
        PnpWebpackPlugin.moduleLoader(module),
      ],
    },

    resolve: {
      plugins: [
        // Adds support for installing with Plug'n'Play, leading to faster installs and adding
        // guards against forgotten dependencies and such.
        PnpWebpackPlugin,
        // Prevents users from importing files from outside of node_modules/.
        // This often causes confusion because we only process files within the root folder with babel.
        // To fix this, we prevent you from importing files out of the root folder -- if you'd like to,
        // please link the files into your node_modules/ and let module-resolution kick in.
        // Make sure your source files are compiled, as they will not be processed in any way.
        new ModuleScopePlugin(locations.template.folder, [locations.packageJson]),
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
  });
};
