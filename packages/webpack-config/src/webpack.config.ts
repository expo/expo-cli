/** @internal */ /** */
/* eslint-env node */
import PnpWebpackPlugin from 'pnp-webpack-plugin';
import ModuleNotFoundPlugin from 'react-dev-utils/ModuleNotFoundPlugin';
import WatchMissingNodeModulesPlugin from 'react-dev-utils/WatchMissingNodeModulesPlugin';
import webpack, { Configuration, HotModuleReplacementPlugin, Options, Output } from 'webpack';
import WebpackDeepScopeAnalysisPlugin from 'webpack-deep-scope-plugin';
import ManifestPlugin from 'webpack-manifest-plugin';
import { projectHasModule } from '@expo/config';
import chalk from 'chalk';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import {
  IconOptions,
  getChromeIconConfig,
  getFaviconIconConfig,
  getSafariIconConfig,
  getSafariStartupImageConfig,
} from 'expo-pwa';
import { readFileSync } from 'fs-extra';
import { boolish } from 'getenv';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { parse } from 'node-html-parser';
import path from 'path';

import {
  withAlias,
  withDevServer,
  withNodeMocks,
  withOptimizations,
  withPlatformSourceMaps,
} from './addons';
import {
  getAliases,
  getConfig,
  getMode,
  getModuleFileExtensions,
  getPathsAsync,
  getPublicPaths,
} from './env';
import { createAllLoaders } from './loaders';
import {
  ApplePwaWebpackPlugin,
  ChromeIconsWebpackPlugin,
  ExpoDefinePlugin,
  ExpoHtmlWebpackPlugin,
  ExpoInterpolateHtmlPlugin,
  ExpoProgressBarPlugin,
  ExpoPwaManifestWebpackPlugin,
  FaviconWebpackPlugin,
} from './plugins';
import { HTMLLinkNode } from './plugins/ModifyHtmlWebpackPlugin';
import { Arguments, DevConfiguration, Environment, FilePaths, Mode } from './types';
import { overrideWithPropertyOrConfig } from './utils';

// Source maps are resource heavy and can cause out of memory issue for large source files.
const shouldUseSourceMap = boolish('GENERATE_SOURCEMAP', true);

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
    return shouldUseSourceMap ? 'source-map' : false;
  }
  if (development) {
    return 'cheap-module-source-map';
  }
  return false;
}

function getOutput(
  locations: FilePaths,
  mode: Mode,
  publicPath: string,
  platform: Environment['platform']
): Output {
  const commonOutput: Output = {
    // We inferred the "public path" (such as / or /my-project) from homepage.
    // We use "/" in development.
    publicPath,
    // Build folder (default `web-build`)
    path: locations.production.folder,
    // this defaults to 'window', but by setting it to 'this' then
    // module chunks which are built will work in web workers as well.
    globalObject: 'this',
  };

  if (mode === 'production') {
    commonOutput.filename = 'static/js/[name].[contenthash:8].js';
    // There are also additional JS chunk files if you use code splitting.
    commonOutput.chunkFilename = 'static/js/[name].[contenthash:8].chunk.js';
    // Point sourcemap entries to original disk location (format as URL on Windows)
    commonOutput.devtoolModuleFilenameTemplate = (
      info: webpack.DevtoolModuleFilenameTemplateInfo
    ): string => path.relative(locations.root, info.absoluteResourcePath).replace(/\\/g, '/');
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

  if (isPlatformNative(platform)) {
    // Give the output bundle a constant name to prevent caching.
    // Also there are no actual files generated in dev.
    commonOutput.filename = `index.bundle`;
  }

  return commonOutput;
}

function isPlatformNative(platform: string): boolean {
  if (platform === 'ios' || platform === 'android') {
    return true;
  }
  return false;
}

function getPlatforms(platform: string): string[] {
  if (platform === 'ios' || platform === 'android') {
    return [platform, 'native'];
  }
  return [platform];
}

export default async function (
  env: Environment,
  argv: Arguments = {}
): Promise<Configuration | DevConfiguration> {
  if ('report' in env) {
    console.warn(
      chalk.bgRed.black(
        `The \`report\` property of \`@expo/webpack-config\` is now deprecated.\nhttps://expo.fyi/webpack-report-property-is-deprecated`
      )
    );
  }
  const config = getConfig(env);
  const mode = getMode(env);
  const isDev = mode === 'development';
  const isProd = mode === 'production';

  // Because the native React runtime is different to the browser we need to make
  // some core modifications to webpack.
  const isNative = ['ios', 'android'].includes(env.platform);

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

  let generatePWAImageAssets: boolean = !isNative && !isDev;
  if (!isDev && typeof env.pwa !== 'undefined') {
    generatePWAImageAssets = env.pwa;
  }

  const filesToCopy = [
    {
      from: locations.template.folder,
      to: locations.production.folder,
      // We generate new versions of these based on the templates
      ignore: [
        'expo-service-worker.js',
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
  ];

  if (env.offline !== false) {
    filesToCopy.push({
      from: locations.template.serviceWorker,
      to: locations.production.serviceWorker,
    });
  }

  const templateIndex = parse(readFileSync(locations.template.indexHtml, { encoding: 'utf8' }));

  // @ts-ignore
  const templateLinks = templateIndex.querySelectorAll('link');
  const links: HTMLLinkNode[] = templateLinks.map((value: any) => ({
    rel: value.getAttribute('rel'),
    media: value.getAttribute('media'),
    href: value.getAttribute('href'),
    sizes: value.getAttribute('sizes'),
    node: value,
  }));
  // @ts-ignore
  const templateMeta = templateIndex.querySelectorAll('meta');
  const meta: HTMLLinkNode[] = templateMeta.map((value: any) => ({
    name: value.getAttribute('name'),
    content: value.getAttribute('content'),
    node: value,
  }));

  const [manifestLink] = links.filter(
    link => typeof link.rel === 'string' && link.rel.split(' ').includes('manifest')
  );
  let templateManifest = locations.template.manifest;
  if (manifestLink && manifestLink.href) {
    templateManifest = locations.template.get(manifestLink.href);
  }

  const ensureSourceAbsolute = (input: IconOptions | null): IconOptions | null => {
    if (!input) return input;
    return {
      ...input,
      src: locations.absolute(input.src),
    };
  };

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
    output: getOutput(locations, mode, publicPath, env.platform),
    plugins: [
      // Delete the build folder
      isProd &&
        new CleanWebpackPlugin({
          cleanOnceBeforeBuildPatterns: [locations.production.folder],
          dry: false,
          verbose: false,
        }),
      // Copy the template files over
      isProd && new CopyWebpackPlugin(filesToCopy),

      // Generate the `index.html`
      new ExpoHtmlWebpackPlugin(env, templateIndex),

      ExpoInterpolateHtmlPlugin.fromEnv(env, ExpoHtmlWebpackPlugin),

      env.pwa &&
        new ExpoPwaManifestWebpackPlugin(
          {
            template: templateManifest,
            path: 'manifest.json',
            publicPath,
          },
          config
        ),
      new FaviconWebpackPlugin(
        {
          projectRoot: env.projectRoot,
          publicPath,
          links,
        },
        ensureSourceAbsolute(getFaviconIconConfig(config))
      ),
      generatePWAImageAssets &&
        new ApplePwaWebpackPlugin(
          {
            projectRoot: env.projectRoot,
            publicPath,
            links,
            meta,
          },
          {
            name: env.config.web.shortName,
            isFullScreen: env.config.web.meta.apple.touchFullscreen,
            isWebAppCapable: env.config.web.meta.apple.mobileWebAppCapable,
            barStyle: env.config.web.meta.apple.barStyle,
          },
          ensureSourceAbsolute(getSafariIconConfig(env.config)),
          ensureSourceAbsolute(getSafariStartupImageConfig(env.config))
        ),
      generatePWAImageAssets &&
        new ChromeIconsWebpackPlugin(
          {
            projectRoot: env.projectRoot,
            publicPath,
          },
          ensureSourceAbsolute(getChromeIconConfig(config))
        ),

      // This gives some necessary context to module not found errors, such as
      // the requesting resource.
      new ModuleNotFoundPlugin(locations.root),

      new ExpoDefinePlugin({
        mode,
        publicUrl,
        config,
      }),

      // Disable chunking on native
      // https://gist.github.com/glennreyes/f538a369db0c449b681e86ef7f86a254#file-razzle-config-js
      isNative &&
        new webpack.optimize.LimitChunkCountPlugin({
          maxChunks: 1,
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
      // Generate an asset manifest file with the following content:
      // - "files" key: Mapping of all asset filenames to their corresponding
      //   output file so that tools can pick it up without having to parse
      //   `index.html`
      // - "entrypoints" key: Array of files which are included in `index.html`,
      //   can be used to reconstruct the HTML if necessary
      new ManifestPlugin({
        fileName: 'asset-manifest.json',
        publicPath,
        filter: ({ path }) => {
          if (
            path.match(/(apple-touch-startup-image|apple-touch-icon|chrome-icon|precache-manifest)/)
          ) {
            return false;
          }
          // Remove compressed versions and service workers
          return !(path.endsWith('.gz') || path.endsWith('worker.js'));
        },
        generate: (seed: Record<string, any>, files, entrypoints) => {
          const manifestFiles = files.reduce<Record<string, string>>((manifest, file) => {
            if (file.name) {
              manifest[file.name] = file.path;
            }
            return manifest;
          }, seed);
          const entrypointFiles = entrypoints.app.filter(fileName => !fileName.endsWith('.map'));

          return {
            files: manifestFiles,
            entrypoints: entrypointFiles,
          };
        },
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
      extensions: getModuleFileExtensions(...getPlatforms(env.platform ?? 'web')),
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

  webpackConfig = withPlatformSourceMaps(webpackConfig, env);

  if (isProd) {
    webpackConfig = withOptimizations(webpackConfig);
  } else {
    webpackConfig = withDevServer(webpackConfig, env, {
      allowedHost: argv.allowedHost,
      proxy: argv.proxy,
    });
  }

  return withNodeMocks(withAlias(webpackConfig, getAliases(env.projectRoot)));
}
