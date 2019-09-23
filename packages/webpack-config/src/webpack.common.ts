// @ts-ignore
import WebpackPWAManifestPlugin from '@expo/webpack-pwa-manifest-plugin';
import InterpolateHtmlPlugin from 'react-dev-utils/InterpolateHtmlPlugin';
import { Options, Configuration, HotModuleReplacementPlugin } from 'webpack';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
// @ts-ignore
import WebpackDeepScopeAnalysisPlugin from 'webpack-deep-scope-plugin';
import WorkboxPlugin from 'workbox-webpack-plugin';
// @ts-ignore
import CleanWebpackPlugin from 'clean-webpack-plugin';
// @ts-ignore
import ModuleNotFoundPlugin from 'react-dev-utils/ModuleNotFoundPlugin';
// @ts-ignore
import PnpWebpackPlugin from 'pnp-webpack-plugin';
import ModuleScopePlugin from 'react-dev-utils/ModuleScopePlugin';
import ManifestPlugin from 'webpack-manifest-plugin';
// @ts-ignore
import CaseSensitivePathsPlugin from 'case-sensitive-paths-webpack-plugin';
import WatchMissingNodeModulesPlugin from 'react-dev-utils/WatchMissingNodeModulesPlugin';
// @ts-ignore
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
// @ts-ignore
import CompressionPlugin from 'compression-webpack-plugin';
// @ts-ignore
import BrotliPlugin from 'brotli-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import { getPathsAsync } from './utils/paths';

import { ExpoDefinePlugin, ExpoProgressBarPlugin, ExpoHtmlWebpackPlugin } from './plugins';
import {
  DEFAULT_ALIAS,
  getModuleFileExtensions,
  enableWithPropertyOrConfig,
  overrideWithPropertyOrConfig,
} from './utils/config';
import createFontLoader from './loaders/createFontLoader';
import createBabelLoader from './loaders/createBabelLoader';
import getMode from './utils/getMode';
import getConfig from './utils/getConfig';
import { Environment, Arguments } from './types';

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

function createNoJSComponent(message: string): string {
  // from twitter.com
  return `" <form action="location.reload()" method="POST" style="background-color:#fff;position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;"><div style="font-size:18px;font-family:Helvetica,sans-serif;line-height:24px;margin:10%;width:80%;"> <p>${message}</p> <p style="margin:20px 0;"> <button type="submit" style="background-color: #4630EB; border-radius: 100px; border: none; box-shadow: none; color: #fff; cursor: pointer; font-size: 14px; font-weight: bold; line-height: 20px; padding: 6px 16px;">Reload</button> </p> </div> </form> "`;
}

function getDevtool(
  { production, development }: { production: boolean; development: boolean },
  { devtool }: { devtool?: Options.Devtool }
): Options.Devtool {
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

export default async function(env: Environment): Promise<Configuration> {
  const config = getConfig(env);
  const mode = getMode(env);
  const isDev = mode === 'development';
  const isProd = mode === 'production';
  const { platform = 'web' } = env;

  // Enables deep scope analysis in production mode.
  // Remove unused import/exports
  // override: `env.removeUnusedImportExports`
  const deepScopeAnalysisEnabled = overrideWithPropertyOrConfig(
    env.removeUnusedImportExports,
    false
    // isProd
  );

  const locations = env.locations || (await getPathsAsync(env.projectRoot));

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
    middlewarePlugins.push(new WebpackDeepScopeAnalysisPlugin());
  }

  const serviceWorker = overrideWithPropertyOrConfig(
    // Prevent service worker in development mode
    config.web.build.serviceWorker,
    DEFAULT_SERVICE_WORKER
  );
  if (serviceWorker) {
    // Generate a service worker script that will precache, and keep up to date,
    // the HTML & assets that are part of the Webpack build.
    middlewarePlugins.push(
      new WorkboxPlugin.GenerateSW({
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
        ...(isDev
          ? {
              include: [], // Don't cache any assets in dev mode.
            }
          : {}),
        ...serviceWorker,
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
  let reportPlugins: any[] = [];

  const reportConfig = enableWithPropertyOrConfig(env.report, DEFAULT_REPORT_CONFIG, true);
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

  const devtool = getDevtool({ production: isProd, development: isDev }, config.web.build);

  const babelProjectRoot = babelAppConfig.root || locations.root;

  const babelLoader = createBabelLoader({
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
    createFontLoader({ locations }),
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
  const gzipConfig = isProd && overrideWithPropertyOrConfig(buildConfig.gzip, DEFAULT_GZIP);
  const brotliConfig = isProd && enableWithPropertyOrConfig(buildConfig.brotli, DEFAULT_BROTLI);

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
        new CleanWebpackPlugin([locations.production.folder], {
          root: locations.root,
          dry: false,
          verbose: false,
        }),
      // Copy the template files over
      isProd &&
        new CopyWebpackPlugin([
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
      new ExpoHtmlWebpackPlugin(env),

      // Add variables to the `index.html`
      new InterpolateHtmlPlugin(ExpoHtmlWebpackPlugin, {
        WEB_PUBLIC_URL: publicPath,
        WEB_TITLE: config.web.name,
        NO_SCRIPT: noJSComponent,
        LANG_ISO_CODE: lang,
        ROOT_ID: rootId,
      }),

      new WebpackPWAManifestPlugin(config, {
        publicPath,
        noResources: isDev || !env.pwa,
        filename: locations.production.manifest,
        HtmlWebpackPlugin: ExpoHtmlWebpackPlugin,
      }),

      // This gives some necessary context to module not found errors, such as
      // the requesting resource.
      new ModuleNotFoundPlugin(locations.root),

      new ExpoDefinePlugin({
        mode,
        publicUrl,
        config,
        productionManifestPath: locations.production.manifest,
      }),

      // This is necessary to emit hot updates (currently CSS only):
      isDev && new HotModuleReplacementPlugin(),
      // Watcher doesn't work well if you mistype casing in a path so we use
      // a plugin that prints an error when you attempt to do this.
      // See https://github.com/facebook/create-react-app/issues/240
      isDev && new CaseSensitivePathsPlugin(),

      // If you require a missing module and then `npm install` it, you still have
      // to restart the development server for Webpack to discover it. This plugin
      // makes the discovery automatic so you don't have to restart.
      // See https://github.com/facebook/create-react-app/issues/186
      isDev && new WatchMissingNodeModulesPlugin(locations.modules),

      isProd &&
        new MiniCssExtractPlugin({
          // Options similar to the same options in webpackOptions.output
          // both options are optional
          filename: 'static/css/[name].[contenthash:8].css',
          chunkFilename: 'static/css/[name].[contenthash:8].chunk.css',
        }),

      // Generate a manifest file which contains a mapping of all asset filenames
      // to their corresponding output file so that tools can pick it up without
      // having to parse `index.html`.
      new ManifestPlugin({
        fileName: 'asset-manifest.json',
        publicPath,
      }),

      ...middlewarePlugins,

      gzipConfig && new CompressionPlugin(gzipConfig),
      brotliConfig && new BrotliPlugin(brotliConfig),

      new ExpoProgressBarPlugin(),

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
        PnpWebpackPlugin.moduleLoader(module),
      ],
    },
    resolve: {
      alias: DEFAULT_ALIAS,
      extensions: getModuleFileExtensions('web'),
      plugins: [
        // Adds support for installing with Plug'n'Play, leading to faster installs and adding
        // guards against forgotten dependencies and such.
        PnpWebpackPlugin,
        // Prevents users from importing files from outside of node_modules/.
        // This often causes confusion because we only process files within the root folder with babel.
        // To fix this, we prevent you from importing files out of the root folder -- if you'd like to,
        // please link the files into your node_modules/ and let module-resolution kick in.
        // Make sure your source files are compiled, as they will not be processed in any way.
        new ModuleScopePlugin(babelProjectRoot, [locations.packageJson]),
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
    // performance: false,
  };
}
