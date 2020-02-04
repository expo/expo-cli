/** @internal */ /** */
/* eslint-env node */

import WebpackPWAManifestPlugin from '@expo/webpack-pwa-manifest-plugin';
import webpack, { Configuration, HotModuleReplacementPlugin, Options, Output } from 'webpack';
import WebpackDeepScopeAnalysisPlugin from 'webpack-deep-scope-plugin';
import ModuleNotFoundPlugin from 'react-dev-utils/ModuleNotFoundPlugin';
import PnpWebpackPlugin from 'pnp-webpack-plugin';
import ManifestPlugin from 'webpack-manifest-plugin';
import WatchMissingNodeModulesPlugin from 'react-dev-utils/WatchMissingNodeModulesPlugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import { boolish } from 'getenv';
import path from 'path';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';

import { projectHasModule } from '@expo/config';
import { getConfig, getMode, getModuleFileExtensions, getPathsAsync, getPublicPaths } from './env';
import { createAllLoaders } from './loaders';
import {
  ExpoDefinePlugin,
  ExpoHtmlWebpackPlugin,
  ExpoInterpolateHtmlPlugin,
  ExpoProgressBarPlugin,
} from './plugins';
import {
  withAlias,
  withCompression,
  withDevServer,
  withNodeMocks,
  withOptimizations,
  withReporting,
} from './addons';

import { Arguments, DevConfiguration, Environment, FilePaths, Mode } from './types';
import { overrideWithPropertyOrConfig } from './utils';

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

function getOutput(locations: FilePaths, mode: Mode, publicPath: string): Output {
  const commonOutput: Output = {
    sourceMapFilename: '[chunkhash].map',
    // We inferred the "public path" (such as / or /my-project) from homepage.
    // We use "/" in development.
    publicPath,
    // Build folder (default `web-build`)
    path: locations.production.folder,
  };

  if (mode === 'production') {
    commonOutput.filename = 'static/js/[name].[contenthash:8].js';
    // There are also additional JS chunk files if you use code splitting.
    commonOutput.chunkFilename = 'static/js/[name].[contenthash:8].chunk.js';
    // Point sourcemap entries to original disk location (format as URL on Windows)
    commonOutput.devtoolModuleFilenameTemplate = (
      info: webpack.DevtoolModuleFilenameTemplateInfo
    ): string => locations.absolute(info.absoluteResourcePath).replace(/\\/g, '/');
  } else {
    // Add comments that describe the file import/exports.
    // This will make it easier to debug.
    commonOutput.pathinfo = true;
    // Give the output bundle a constant name to prevent caching.
    // Also there are no actual files generated in dev.
    commonOutput.filename = 'static/js/bundle.js';
    // There are also additional JS chunk files if you use code splitting.
    commonOutput.chunkFilename = 'static/js/[name].chunk.js';
    // Point sourcemap entries to original disk location (format as URL on Windows)
    commonOutput.devtoolModuleFilenameTemplate = (
      info: webpack.DevtoolModuleFilenameTemplateInfo
    ): string => path.resolve(info.absoluteResourcePath).replace(/\\/g, '/');
  }

  return commonOutput;
}

export default async function(
  env: Environment,
  argv: Arguments = {}
): Promise<Configuration | DevConfiguration> {
  const config = getConfig(env);
  const mode = getMode(env);
  const isDev = mode === 'development';
  const isProd = mode === 'production';

  // Enables deep scope analysis in production mode.
  // Remove unused import/exports
  // override: `env.removeUnusedImportExports`
  const deepScopeAnalysisEnabled = overrideWithPropertyOrConfig(
    env.removeUnusedImportExports,
    false
    // isProd
  );

  const locations = env.locations || (await getPathsAsync(env.projectRoot));

  const { publicPath, publicUrl } = getPublicPaths(env);

  const { build: buildConfig = {} } = config.web || {};

  const devtool = getDevtool(
    { production: isProd, development: isDev },
    buildConfig as {
      devtool: Options.Devtool;
    }
  );

  const appEntry: string[] = [];

  // In solutions like Gatsby the main entry point doesn't need to be known.
  if (locations.appMain) {
    appEntry.push(locations.appMain);
  } else {
    throw new Error(
      `The entry point for your project couldn't be found. Please define it in the package.json main field`
    );
  }

  // Add a loose requirement on the ResizeObserver polyfill if it's installed...
  // Avoid `withEntry` as we don't need so much complexity with this config.
  const resizeObserverPolyfill = projectHasModule(
    'resize-observer-polyfill/dist/ResizeObserver.global',
    env.projectRoot,
    config
  );
  if (resizeObserverPolyfill) {
    appEntry.unshift(resizeObserverPolyfill);
  }

  if (isDev) {
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

  let generatePWAImageAssets: boolean = !isDev;
  if (!isDev && typeof env.pwa !== 'undefined') {
    generatePWAImageAssets = env.pwa;
  }

  let webpackConfig: DevConfiguration = {
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
    output: getOutput(locations, mode, publicPath),
    plugins: [
      // Delete the build folder
      isProd &&
        new CleanWebpackPlugin({
          cleanOnceBeforeBuildPatterns: [locations.production.folder],
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
            ignore: [
              'expo-service-worker.js',
              'favicon.ico',
              'serve.json',
              'index.html',
              'icon.png',
              // We copy this over in `withWorkbox` as it must be part of the Webpack `entry` and have templates replaced.
              'register-service-worker.js',
            ],
          },
          {
            from: locations.template.serveJson,
            to: locations.production.serveJson,
          },
          {
            from: locations.template.favicon,
            to: locations.production.favicon,
          },
          {
            from: locations.template.serviceWorker,
            to: locations.production.serviceWorker,
          },
        ]),

      // Generate the `index.html`
      new ExpoHtmlWebpackPlugin(env),

      ExpoInterpolateHtmlPlugin.fromEnv(env, ExpoHtmlWebpackPlugin),

      new WebpackPWAManifestPlugin(config, {
        publicPath,
        projectRoot: env.projectRoot,
        noResources: !generatePWAImageAssets,
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

      deepScopeAnalysisEnabled && new WebpackDeepScopeAnalysisPlugin(),

      new ExpoProgressBarPlugin(),
    ].filter(Boolean),
    module: {
      strictExportPresence: false,
      rules: [
        // Disable require.ensure because it breaks tree shaking.
        { parser: { requireEnsure: false } },
        {
          oneOf: createAllLoaders(env),
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
      mainFields: ['browser', 'module', 'main'],
      extensions: getModuleFileExtensions('web'),
      plugins: [
        // Adds support for installing with Plug'n'Play, leading to faster installs and adding
        // guards against forgotten dependencies and such.
        PnpWebpackPlugin,
      ],
      symlinks: false,
    },
    // Turn off performance processing because we utilize
    // our own (CRA) hints via the FileSizeReporter

    // TODO: Bacon: Remove this higher value
    performance: boolish('CI', false) ? false : { maxAssetSize: 600000, maxEntrypointSize: 600000 },
  };

  if (isProd) {
    webpackConfig = withCompression(withOptimizations(webpackConfig), env);
  } else {
    webpackConfig = withDevServer(webpackConfig, env, {
      allowedHost: argv.allowedHost,
      proxy: argv.proxy,
    });
  }

  return withReporting(withNodeMocks(withAlias(webpackConfig)), env);
}
