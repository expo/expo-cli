/** @internal */ /** */
/* eslint-env node */
import ReactRefreshPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import chalk from 'chalk';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import { createHash } from 'crypto';
import {
  getChromeIconConfig,
  getFaviconIconConfig,
  getSafariIconConfig,
  getSafariStartupImageConfig,
  IconOptions,
} from 'expo-pwa';
import fs from 'fs';
import { readFileSync } from 'fs-extra';
import { boolish } from 'getenv';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { parse } from 'node-html-parser';
import path from 'path';
import ModuleNotFoundPlugin from 'react-dev-utils/ModuleNotFoundPlugin';
import resolveFrom from 'resolve-from';
import webpack, { Configuration } from 'webpack';
import { WebpackManifestPlugin } from 'webpack-manifest-plugin';

import { withAlias, withDevServer, withOptimizations, withPlatformSourceMaps } from './addons';
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
  ExpectedErrorsPlugin,
  ExpoDefinePlugin,
  ExpoHtmlWebpackPlugin,
  ExpoInterpolateHtmlPlugin,
  ExpoProgressBarPlugin,
  ExpoPwaManifestWebpackPlugin,
  FaviconWebpackPlugin,
  NativeAssetsPlugin,
} from './plugins';
import ExpoAppManifestWebpackPlugin from './plugins/ExpoAppManifestWebpackPlugin';
import { HTMLLinkNode } from './plugins/ModifyHtmlWebpackPlugin';
import { Arguments, Environment, FilePaths, Mode } from './types';

// Source maps are resource heavy and can cause out of memory issue for large source files.
const shouldUseSourceMap = boolish('GENERATE_SOURCEMAP', true);
const shouldUseNativeCodeLoading = boolish('EXPO_WEBPACK_USE_NATIVE_CODE_LOADING', false);

const isCI = boolish('CI', false);

function getDevtool(
  { production, development }: { production: boolean; development: boolean },
  { devtool }: { devtool?: string | false }
): string | false {
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

type Output = Configuration['output'];
type DevtoolModuleFilenameTemplateInfo = { root: string; absoluteResourcePath: string };

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
    assetModuleFilename: 'static/media/[name].[hash][ext]',
  };

  if (mode === 'production') {
    commonOutput.filename = 'static/js/[name].[contenthash:8].js';
    // There are also additional JS chunk files if you use code splitting.
    commonOutput.chunkFilename = 'static/js/[name].[contenthash:8].chunk.js';
    // Point sourcemap entries to original disk location (format as URL on Windows)
    commonOutput.devtoolModuleFilenameTemplate = (
      info: DevtoolModuleFilenameTemplateInfo
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
      info: DevtoolModuleFilenameTemplateInfo
      // TODO: revisit for web
    ): string => path.resolve(info.absoluteResourcePath).replace(/\\/g, '/');
  }

  if (!shouldUseNativeCodeLoading && isPlatformNative(platform)) {
    // Give the output bundle a constant name to prevent caching.
    // Also there are no actual files generated in dev.
    commonOutput.filename = `index.bundle`;
    // commonOutput.hotUpdateMainFilename;
    commonOutput.publicPath = `http://localhost:8081/`;
    // This works best for our custom native symbolication middleware
    // commonOutput.devtoolModuleFilenameTemplate = (
    //   info: DevtoolModuleFilenameTemplateInfo
    // ): string => info.resourcePath.replace(/\\/g, '/');
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

function createEnvironmentHash(env: any) {
  const hash = createHash('md5');
  hash.update(JSON.stringify(env));

  return hash.digest('hex');
}

export default async function (env: Environment, argv: Arguments = {}): Promise<Configuration> {
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

  if (isNative) {
    env.pwa = false;
  }

  const locations = env.locations || (await getPathsAsync(env.projectRoot));

  const { publicPath, publicUrl } = getPublicPaths(env);

  const { build: buildConfig = {} } = config.web || {};

  const devtool = getDevtool({ production: isProd, development: isDev }, buildConfig);

  const appEntry: string[] = [];

  // In solutions like Gatsby the main entry point doesn't need to be known.
  if (locations.appMain) {
    appEntry.push(locations.appMain);
  }
  // const webpackDevClientEntry = require.resolve('react-dev-utils/webpackHotDevClient');
  const webpackDevClientEntry = require.resolve('./runtime/webpackHotDevClient');

  if (isNative) {
    const getPolyfillsPath = resolveFrom.silent(
      env.projectRoot,
      'react-native/rn-get-polyfills.js'
    );

    if (getPolyfillsPath) {
      appEntry.unshift(
        ...require(getPolyfillsPath)(),
        resolveFrom(env.projectRoot, 'react-native/Libraries/Core/InitializeCore'),
        require.resolve('./runtime/location-polyfill'),
        require.resolve('./runtime/fetch-async')
      );
      if (isDev) {
        // TODO: Native HMR
      }
    }
  } else {
    // Add a loose requirement on the ResizeObserver polyfill if it's installed...
    const resizeObserverPolyfill = resolveFrom.silent(
      env.projectRoot,
      'resize-observer-polyfill/dist/ResizeObserver.global'
    );
    if (resizeObserverPolyfill) {
      appEntry.unshift(resizeObserverPolyfill);
    }
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
    if (isNative) {
      appEntry.push(webpackDevClientEntry);
    } else {
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
          '**/index.html',
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

  const emacsLockfilePattern = '**/.#*';

  const allLoaders = createAllLoaders(env);
  let webpackConfig: Configuration = {
    // Used to identify the compiler.
    name: env.platform,

    target: ['web'],

    watchOptions: {
      aggregateTimeout: 5,
      ignored: [
        '**/.git/**',
        '**/node_modules/**',
        '**/.expo/**',
        '**/.expo-shared/**',
        '**/web-build/**',
        // can be removed after https://github.com/paulmillr/chokidar/issues/955 is released
        emacsLockfilePattern,
      ],
    },
    mode,
    entry: appEntry,

    // https://webpack.js.org/configuration/other-options/#bail
    // Fail out on the first error instead of tolerating it.
    bail: isProd,
    devtool,
    // This must point to the project root (where the webpack.config.js would normally be located).
    // If this is anywhere else, the source maps and errors won't show correct paths.
    context: env.projectRoot ?? __dirname,
    // configures where the build ends up
    output: getOutput(locations, mode, publicPath, env.platform),

    // Disable file info logs.
    // stats: 'verbose',

    cache: {
      type: 'filesystem',
      version: createEnvironmentHash(process.env),
      cacheDirectory: env.locations.appWebpackCache,
      store: 'pack',
      buildDependencies: {
        defaultWebpack: [path.join(path.dirname(require.resolve('webpack/package.json')), 'lib/')],
        config: [__filename],
        tsconfig: [env.locations.appTsConfig, env.locations.appJsConfig].filter(f =>
          fs.existsSync(f)
        ),
      },
    },
    infrastructureLogging: {
      debug: true,
      // level: 'none',
      // level: 'verbose',
    },

    plugins: [
      // Delete the build folder
      isProd &&
        new CleanWebpackPlugin({
          cleanOnceBeforeBuildPatterns: [locations.production.folder],
          dry: false,
          verbose: false,
        }),
      // Copy the template files over
      isProd && !isNative && new CopyWebpackPlugin({ patterns: filesToCopy }),

      // Generate the `index.html`
      (!isNative || shouldUseNativeCodeLoading) && new ExpoHtmlWebpackPlugin(env, templateIndex),

      (!isNative || shouldUseNativeCodeLoading) &&
        ExpoInterpolateHtmlPlugin.fromEnv(env, ExpoHtmlWebpackPlugin),

      isNative &&
        new NativeAssetsPlugin({
          platforms: [env.platform, 'native'],
          persist: isProd,
          assetExtensions: [
            // Image formats
            'bmp',
            'gif',
            'jpg',
            'jpeg',
            'png',
            'psd',
            'svg',
            'webp',
            // Video formats
            'm4v',
            'mov',
            'mp4',
            'mpeg',
            'mpg',
            'webm',
            // Audio formats
            'aac',
            'aiff',
            'caf',
            'm4a',
            'mp3',
            'wav',
            // Document formats
            'html',
            'pdf',
            'yaml',
            'yml',
            // Font formats
            'otf',
            'ttf',
            // Archives (virtual files)
            'zip',
          ],
        }),

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
        platform: env.platform,
      }),

      // Disable chunking on native
      // https://gist.github.com/glennreyes/f538a369db0c449b681e86ef7f86a254#file-razzle-config-js
      // isNative &&
      //   new webpack.optimize.LimitChunkCountPlugin({
      //     maxChunks: 1,
      //   }),

      // Replace the Metro specific HMR code in `react-native` with
      // a shim.
      isNative &&
        new webpack.NormalModuleReplacementPlugin(
          /react-native\/Libraries\/Utilities\/HMRClient\.js$/,
          function (resource) {
            const request = require.resolve('./runtime/metro-runtime-shim');
            const context = path.dirname(request);
            resource.request = request;
            resource.context = context;
            resource.createData.resource = request;
            resource.createData.context = context;
          }
        ),
      isNative &&
        new webpack.NormalModuleReplacementPlugin(
          /react-native\/Libraries\/Core\/setUpReactRefresh\.js$/,
          function (resource) {
            const request = require.resolve('./runtime/setUpReactRefresh-shim');
            const context = path.dirname(request);
            resource.request = request;
            resource.context = context;
            resource.createData.resource = request;
            resource.createData.context = context;
          }
        ),

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
        new WebpackManifestPlugin({
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
            const entrypointFiles = entrypoints.main.filter(fileName => !fileName.endsWith('.map'));

            return {
              files: manifestFiles,
              entrypoints: entrypointFiles,
            };
          },
        }),

      // Replace the Metro specific HMR code in `react-native` with
      // a shim.
      isNative &&
        isDev &&
        new webpack.NormalModuleReplacementPlugin(/react-error-overlay$/, function (resource) {
          const request = require.resolve('./runtime/react-error-overlay-shim');
          const context = path.dirname(request);
          resource.request = request;
          resource.context = context;
          resource.createData.resource = request;
          resource.createData.context = context;
        }),
      isNative &&
        isDev &&
        new webpack.NormalModuleReplacementPlugin(
          /webpack\/runtime\/location-polyfill.js$/,
          function (resource) {
            const request = require.resolve('./runtime/location-polyfill');
            const context = path.dirname(request);
            resource.request = request;
            resource.context = context;
            resource.createData.resource = request;
            resource.createData.context = context;
          }
        ),
      new HMRPlugin({ isNative, isDev }),

      new ExpectedErrorsPlugin(),
      // Skip using a progress bar in CI
      env.logger &&
        new ExpoProgressBarPlugin({
          logger: env.logger,
          nonInteractive: isCI,
          bundleDetails: {
            bundleType: 'bundle',
            platform: env.platform,
            entryFile: locations.appMain,
            dev: isDev ?? false,
            minify: isProd ?? false,
          },
        }),
    ].filter(Boolean),

    module: {
      strictExportPresence: false,
      // @ts-ignore
      rules: [
        // Handle node_modules packages that contain sourcemaps
        shouldUseSourceMap && {
          enforce: 'pre',
          exclude: /@babel(?:\/|\\{1,2})runtime/,
          test: /\.(js|mjs|jsx|ts|tsx|css)$/,
          use: require.resolve('source-map-loader'),
        },
        {
          oneOf: allLoaders,
        },
      ].filter(Boolean),
    },
    resolve: {
      // modules: ['node_modules'],
      mainFields: isNative ? ['react-native', 'browser', 'main'] : ['browser', 'module', 'main'],
      aliasFields: isNative ? ['react-native', 'browser', 'main'] : [],
      extensions: getPlatformsExtensions(env.platform),
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
    webpackConfig.target = false;
    webpackConfig.output!.chunkLoading = 'jsonp';
    webpackConfig.output!.chunkFormat = 'array-push';
    webpackConfig.output!.globalObject = 'this';
    webpackConfig.output!.chunkLoadingGlobal = 'exLoadChunk';
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
    webpackConfig = withAlias(webpackConfig, getAliases(env.projectRoot));
  } else {
    webpackConfig = withAlias(webpackConfig, {
      'react-native$': resolveFrom(env.projectRoot, 'react-native'),
      'react-native': path.dirname(resolveFrom(env.projectRoot, 'react-native/package.json')),
      react$: resolveFrom(env.projectRoot, 'react'),

      'react-refresh': path.dirname(require.resolve('react-refresh/package.json')),
      'react-refresh/runtime': require.resolve('react-refresh/runtime'),
      'react-is$': resolveFrom(env.projectRoot, 'react-is'),
    });
  }

  return webpackConfig;
}
export class HMRPlugin {
  constructor(public config: { isDev: boolean; isNative: boolean }) {}

  apply(compiler: webpack.Compiler) {
    if (this.config?.isDev) {
      new ReactRefreshPlugin({
        overlay: false,
      }).apply(compiler);

      // To avoid the problem from https://github.com/facebook/react/issues/20377
      // we need to move React Refresh entry that `ReactRefreshPlugin` injects to evaluate right
      // before the `WebpackHMRClient` and after `InitializeCore` which sets up React DevTools.
      // Thanks to that the initialization order is correct:
      // 0. Polyfills
      // 1. `InitilizeCore` -> React DevTools
      // 2. Rect Refresh Entry
      // 3. `WebpackHMRClient`
      const getAdjustedEntry = (entry: any) => {
        for (const key in entry) {
          const { import: entryImports = [] } = entry[key];
          const refreshEntryIndex = entryImports.findIndex((value: string) =>
            /ReactRefreshEntry\.js/.test(value)
          );
          if (refreshEntryIndex >= 0) {
            const refreshEntry = entryImports[refreshEntryIndex];
            entryImports.splice(refreshEntryIndex, 1);

            const hmrClientIndex = entryImports.findIndex((value: string) =>
              /webpackHotDevClient\.js/.test(value)
            );
            entryImports.splice(hmrClientIndex, 0, refreshEntry);
          }

          entry[key].import = entryImports;
        }

        console.log(entry);

        return entry;
      };

      if (typeof compiler.options.entry !== 'function') {
        compiler.options.entry = getAdjustedEntry(compiler.options.entry);
      } else {
        const getEntry = compiler.options.entry;
        compiler.options.entry = async () => {
          const entry = await getEntry();
          return getAdjustedEntry(entry);
        };
      }
    }
  }
}
