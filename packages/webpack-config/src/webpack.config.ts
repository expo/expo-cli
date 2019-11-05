import WebpackPWAManifestPlugin from '@expo/webpack-pwa-manifest-plugin';
import InterpolateHtmlPlugin from 'react-dev-utils/InterpolateHtmlPlugin';
import { Options, Configuration, HotModuleReplacementPlugin, Output } from 'webpack';
// @ts-ignore
import WebpackDeepScopeAnalysisPlugin from 'webpack-deep-scope-plugin';
// @ts-ignore
import CleanWebpackPlugin from 'clean-webpack-plugin';
// @ts-ignore
import ModuleNotFoundPlugin from 'react-dev-utils/ModuleNotFoundPlugin';
// @ts-ignore
import PnpWebpackPlugin from 'pnp-webpack-plugin';
import ModuleScopePlugin from 'react-dev-utils/ModuleScopePlugin';
import ManifestPlugin from 'webpack-manifest-plugin';
import WatchMissingNodeModulesPlugin from 'react-dev-utils/WatchMissingNodeModulesPlugin';
// @ts-ignore
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import { boolish } from 'getenv';
import path from 'path';
import webpack from 'webpack';
import { getPathsAsync, getPublicPaths } from './utils/paths';
import createAllLoaders from './loaders/createAllLoaders';
import { ExpoDefinePlugin, ExpoProgressBarPlugin, ExpoHtmlWebpackPlugin } from './plugins';
import { getModuleFileExtensions } from './utils';
import withOptimizations from './withOptimizations';
import withReporting from './withReporting';
import withCompression from './withCompression';

import createDevServerConfigAsync from './createDevServerConfigAsync';
import { Arguments, DevConfiguration, FilePaths, Mode } from './types';

import { DEFAULT_ALIAS, overrideWithPropertyOrConfig } from './utils/config';
import getMode from './utils/getMode';
import getConfig from './utils/getConfig';
import { Environment } from './types';

function createNoJSComponent(message: string): string {
  // from twitter.com
  return `" <form action="location.reload()" method="POST" style="background-color:#fff;position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;"><div style="font-size:18px;font-family:Helvetica,sans-serif;line-height:24px;margin:10%;width:80%;"> <p>${message}</p> <p style="margin:20px 0;"> <button type="submit" style="background-color: #4630EB; border-radius: 100px; border: none; box-shadow: none; color: #fff; cursor: pointer; font-weight: bold; line-height: 20px; padding: 6px 16px;">Reload</button> </p> </div> </form> "`;
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

  const { build: buildConfig = {}, lang } = config.web;
  const { rootId, babel: babelAppConfig = {} } = buildConfig;
  const { noJavaScriptMessage } = config.web.dangerous;
  const noJSComponent = createNoJSComponent(noJavaScriptMessage);

  const devtool = getDevtool({ production: isProd, development: isDev }, buildConfig);

  const babelProjectRoot = babelAppConfig.root || locations.root;

  const appEntry: string[] = [];

  // In solutions like Gatsby the main entry point doesn't need to be known.
  if (locations.appMain) {
    appEntry.push(locations.appMain);
  } else {
    throw new Error(
      `The entry point for your project couldn't be found. Please define it in the package.json main field`
    );
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
      alias: DEFAULT_ALIAS,
      mainFields: ['browser', 'module', 'main'],
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
    // Turn off performance processing because we utilize
    // our own (CRA) hints via the FileSizeReporter
    performance: boolish('CI', false) ? false : undefined,
  };

  if (isDev) {
    webpackConfig.devServer = await createDevServerConfigAsync(env, argv);
  } else if (isProd) {
    webpackConfig = withCompression(withOptimizations(webpackConfig), env);
  }

  return withReporting(withNodeMocks(webpackConfig), env);
}

// Some libraries import Node modules but don't use them in the browser.
// Tell Webpack to provide empty mocks for them so importing them works.
function withNodeMocks(
  webpackConfig: Configuration | DevConfiguration
): Configuration | DevConfiguration {
  webpackConfig.node = {
    ...(webpackConfig.node || {}),
    module: 'empty',
    dgram: 'empty',
    dns: 'mock',
    fs: 'empty',
    http2: 'empty',
    net: 'empty',
    tls: 'empty',
    child_process: 'empty',
  };
  return webpackConfig;
}
