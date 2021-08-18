/** @internal */ /** */
/* eslint-env node */
import chalk from 'chalk';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import {
  getChromeIconConfig,
  getFaviconIconConfig,
  getSafariIconConfig,
  getSafariStartupImageConfig,
  IconOptions,
} from 'expo-pwa';
import { readFileSync } from 'fs-extra';
import { boolish } from 'getenv';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { parse } from 'node-html-parser';
import path from 'path';
import PnpWebpackPlugin from 'pnp-webpack-plugin';
import ModuleNotFoundPlugin from 'react-dev-utils/ModuleNotFoundPlugin';
import WatchMissingNodeModulesPlugin from 'react-dev-utils/WatchMissingNodeModulesPlugin';
import resolveFrom from 'resolve-from';
import webpack, { Configuration, HotModuleReplacementPlugin, Options, Output } from 'webpack';
import ManifestPlugin from 'webpack-manifest-plugin';

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
  getNativeModuleFileExtensions,
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
import ExpoAppManifestWebpackPlugin from './plugins/ExpoAppManifestWebpackPlugin';
import { HTMLLinkNode } from './plugins/ModifyHtmlWebpackPlugin';
import { Arguments, DevConfiguration, Environment, FilePaths, Mode } from './types';

// Source maps are resource heavy and can cause out of memory issue for large source files.
const shouldUseSourceMap = boolish('GENERATE_SOURCEMAP', true);
const shouldUseNativeCodeLoading = boolish('EXPO_WEBPACK_USE_NATIVE_CODE_LOADING', false);

const isCI = boolish('CI', false);

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

  if (!shouldUseNativeCodeLoading && isPlatformNative(platform)) {
    // Give the output bundle a constant name to prevent caching.
    // Also there are no actual files generated in dev.
    commonOutput.filename = `index.bundle`;
  }

  return commonOutput;
}

function isPlatformNative(platform: string): boolean {
  return ['ios', 'android'].includes(platform);
}

function getPlatformsExtensions(platform: string): string[] {
  if (isPlatformNative(platform)) {
    return getNativeModuleFileExtensions(platform, 'native');
  }
  return getModuleFileExtensions(platform);
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
  const webpackDevClientEntry = require.resolve('react-dev-utils/webpackHotDevClient');

  if (isNative) {
    const reactNativeModulePath = resolveFrom.silent(env.projectRoot, 'react-native');
    if (reactNativeModulePath) {
      for (const polyfill of [
        'Core/InitializeCore.js',
        'polyfills/Object.es7.js',
        'polyfills/error-guard.js',
        'polyfills/console.js',
      ]) {
        const resolvedPolyfill = resolveFrom.silent(
          env.projectRoot,
          `react-native/Libraries/${polyfill}`
        );
        if (resolvedPolyfill) appEntry.unshift(resolvedPolyfill);
      }
    }
  } else {
    // Add a loose requirement on the ResizeObserver polyfill if it's installed...
    // Avoid `withEntry` as we don't need so much complexity with this config.
    const resizeObserverPolyfill = resolveFrom.silent(
      env.projectRoot,
      'resize-observer-polyfill/dist/ResizeObserver.global'
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
      appEntry.unshift(webpackDevClientEntry);
    }
  }

  let generatePWAImageAssets: boolean = !isNative && !isDev;
  if (!isDev && typeof env.pwa !== 'undefined') {
    generatePWAImageAssets = env.pwa;
  }

  const filesToCopy: any[] = [
    {
      from: locations.template.folder,
      to: locations.production.folder,
      toType: 'dir',
      noErrorOnMissing: true,
      globOptions: {
        dot: true,
        // We generate new versions of these based on the templates
        ignore: [
          // '**/serve.json',
          // '**/index.html',
          '**/icon.png',
        ],
      },
    },
    {
      from: locations.template.serveJson,
      to: locations.production.serveJson,
    },
  ];

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
  // Only inject a manifest tag if the template is missing one.
  // This enables users to disable tag injection.
  const shouldInjectManifestTag = !manifestLink;
  if (manifestLink?.href) {
    // Often the manifest will be referenced as `/manifest.json` (to support public paths).
    // We've detected that the user has manually added a manifest tag to their template index.html which according
    // to our docs means they want to use a custom manifest.json instead of having a new one generated.
    //
    // Normalize the link (removing the beginning slash) so it can be resolved relative to the user's static folder.
    // Ref: https://docs.expo.dev/guides/progressive-web-apps/#manual-setup
    if (manifestLink.href.startsWith('/')) {
      manifestLink.href = manifestLink.href.substring(1);
    }
    templateManifest = locations.template.get(manifestLink.href);
  }

  const ensureSourceAbsolute = (input: IconOptions | null): IconOptions | null => {
    if (!input) return input;
    return {
      ...input,
      src: locations.absolute(input.src),
    };
  };

  // TODO(Bacon): Move to expo/config - manifest code from XDL Project
  const publicConfig = {
    ...config,
    developer: {
      tool: 'expo-cli',
      projectRoot: env.projectRoot,
    },
    packagerOpts: {
      dev: !isProd,
      minify: isProd,
      https: env.https,
    },
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
    // This must point to the project root (where the webpack.config.js would normally be located).
    // If this is anywhere else, the source maps and errors won't show correct paths.
    context: env.projectRoot ?? __dirname,
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
      isProd && new CopyWebpackPlugin({ patterns: filesToCopy }),

      // Generate the `index.html`
      (!isNative || !shouldUseNativeCodeLoading) && new ExpoHtmlWebpackPlugin(env, templateIndex),

      (!isNative || !shouldUseNativeCodeLoading) &&
        ExpoInterpolateHtmlPlugin.fromEnv(env, ExpoHtmlWebpackPlugin),

      isNative &&
        new ExpoAppManifestWebpackPlugin(
          {
            template: locations.template.get('app.config.json'),
            path: 'app.config.json',
            publicPath,
          },
          publicConfig
        ),

      env.pwa &&
        new ExpoPwaManifestWebpackPlugin(
          {
            template: templateManifest,
            path: 'manifest.json',
            publicPath,
            inject: shouldInjectManifestTag,
          },
          config
        ),
      !isNative &&
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
            name: env.config.web?.shortName,
            isFullScreen: env.config.web?.meta?.apple?.touchFullscreen,
            isWebAppCapable: !!env.config.web?.meta?.apple?.mobileWebAppCapable,
            barStyle: env.config.web?.meta?.apple?.barStyle,
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
      !isNative && isDev && new HotModuleReplacementPlugin(),

      // If you require a missing module and then `npm install` it, you still have
      // to restart the development server for Webpack to discover it. This plugin
      // makes the discovery automatic so you don't have to restart.
      // See https://github.com/facebook/create-react-app/issues/186
      isDev && new WatchMissingNodeModulesPlugin(locations.modules),

      !isNative &&
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
      !isNative &&
        new ManifestPlugin({
          fileName: 'asset-manifest.json',
          publicPath,
          filter: ({ path }) => {
            if (
              path.match(
                /(apple-touch-startup-image|apple-touch-icon|chrome-icon|precache-manifest)/
              )
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

      // Skip using a progress bar in CI
      !isCI && new ExpoProgressBarPlugin(),
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
      mainFields: isNative ? ['react-native', 'browser', 'main'] : undefined,
      aliasFields: isNative ? ['react-native', 'browser', 'main'] : undefined,
      extensions: getPlatformsExtensions(env.platform),
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
    performance: isCI ? false : { maxAssetSize: 600000, maxEntrypointSize: 600000 },
  };

  if (!shouldUseNativeCodeLoading) {
    webpackConfig = withPlatformSourceMaps(webpackConfig, env);
  }

  if (isNative) {
    // https://github.com/webpack/webpack/blob/f06086c53b2277e421604c5cea6f32f5c5b6d117/declarations/WebpackOptions.d.ts#L504-L518
    webpackConfig.target = 'webworker';
  }

  if (isProd) {
    webpackConfig = withOptimizations(webpackConfig);
  } else {
    webpackConfig = withDevServer(webpackConfig, env, {
      allowedHost: argv.allowedHost,
      proxy: argv.proxy,
    });
  }

  if (!isNative) {
    webpackConfig = withNodeMocks(withAlias(webpackConfig, getAliases(env.projectRoot)));
  }

  return webpackConfig;
}
