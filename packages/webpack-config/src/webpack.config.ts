import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
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
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { parse } from 'node-html-parser';
import path from 'path';
import resolveFrom from 'resolve-from';
import { Configuration } from 'webpack';
import { WebpackManifestPlugin } from 'webpack-manifest-plugin';

import { withAlias, withDevServer, withOptimizations } from './addons';
import {
  getAliases,
  getConfig,
  getMode,
  getModuleFileExtensions,
  getPathsAsync,
  getPublicPaths,
} from './env';
import { EXPO_DEBUG, isCI, shouldUseSourceMap } from './env/defaults';
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
} from './plugins';
import { HTMLLinkNode } from './plugins/ModifyHtmlWebpackPlugin';
import { ModuleNotFoundPlugin } from './plugins/ModuleNotFoundPlugin';
import { Arguments, Environment, FilePaths, Mode } from './types';

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
  platform: Environment['platform'],
  port: number = 8081
): Output {
  const commonOutput: Output = {
    // We inferred the "public path" (such as / or /my-project) from homepage.
    // We use "/" in development.
    publicPath,
    // Build folder (default `web-build`)
    path: locations.production.folder,
    assetModuleFilename: 'static/media/[name].[hash][ext]',
    // Prevent chunk naming collision across platforms since
    // they're all coming from the same dev server.
    uniqueName: platform,
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

  return commonOutput;
}

function getPlatformsExtensions(platform: string): string[] {
  return getModuleFileExtensions(platform);
}

function createEnvironmentHash(env: typeof process.env) {
  return createHash('md5').update(JSON.stringify(env)).digest('hex');
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

  const locations = env.locations || (await getPathsAsync(env.projectRoot));

  const { publicPath, publicUrl } = getPublicPaths(env);

  const { build: buildConfig = {} } = config.web || {};

  const devtool = getDevtool({ production: isProd, development: isDev }, buildConfig);

  const appEntry: string[] = [];

  // In solutions like Gatsby the main entry point doesn't need to be known.
  if (locations.appMain) {
    appEntry.push(locations.appMain);
  }

  // Add a loose requirement on the ResizeObserver polyfill if it's installed...
  const resizeObserverPolyfill = resolveFrom.silent(
    env.projectRoot,
    'resize-observer-polyfill/dist/ResizeObserver.global'
  );
  if (resizeObserverPolyfill) {
    appEntry.unshift(resizeObserverPolyfill);
  }

  let generatePWAImageAssets: boolean = !isDev;
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
    output: getOutput(locations, mode, publicPath, env.platform, env.port),

    // Disable file info logs.
    stats: EXPO_DEBUG ? 'detailed' : 'errors-warnings',

    cache: {
      type: 'filesystem',
      version: createEnvironmentHash(process.env),
      cacheDirectory: path.join(env.locations.appWebpackCache, env.platform),
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
      debug: EXPO_DEBUG,
      level: EXPO_DEBUG ? 'verbose' : 'none',
    },

    plugins: [
      // Delete the build folder
      isProd &&
        new CleanWebpackPlugin({
          dangerouslyAllowCleanPatternsOutsideProject: true,
          cleanOnceBeforeBuildPatterns: [locations.production.folder],
          dry: false,
          verbose: false,
        }),
      // Copy the template files over
      isProd && new CopyWebpackPlugin({ patterns: filesToCopy }),

      // Generate the `index.html`
      new ExpoHtmlWebpackPlugin(env, templateIndex),

      ExpoInterpolateHtmlPlugin.fromEnv(env, ExpoHtmlWebpackPlugin),

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
        // @ts-ignore
        platform: env.platform,
      }),

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

      new WebpackManifestPlugin({
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
          const entrypointFiles = entrypoints.main.filter(fileName => !fileName.endsWith('.map'));

          return {
            files: manifestFiles,
            entrypoints: entrypointFiles,
          };
        },
      }),

      // TODO: Drop
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

      // Hot refresh
      isDev && new ReactRefreshWebpackPlugin(),
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
          use: [
            {
              loader: require.resolve('source-map-loader'),
              options: {
                filterSourceMappingUrl(url: string, resourcePath: string) {
                  // https://github.com/alewin/useWorker/issues/138
                  if (resourcePath.match(/@koale\/useworker/)) {
                    return 'remove';
                  }
                  return true;
                },
              },
            },
          ],

          resolve: {
            fullySpecified: false,
          },
        },
        {
          oneOf: allLoaders,
        },
      ].filter(Boolean),
    },
    resolve: {
      // modules: ['node_modules'],
      mainFields: ['browser', 'module', 'main'],
      aliasFields: ['browser', 'module', 'main'],
      extensions: getPlatformsExtensions(env.platform),
      symlinks: false,
    },
    // Turn off performance processing because we utilize
    // our own (CRA) hints via the FileSizeReporter

    // TODO: Bacon: Remove this higher value
    performance: isCI ? false : { maxAssetSize: 600000, maxEntrypointSize: 600000 },
  };

  if (isProd) {
    webpackConfig = withOptimizations(webpackConfig);
  } else {
    webpackConfig = withDevServer(webpackConfig, env, {
      allowedHost: argv.allowedHost,
      proxy: argv.proxy,
    });
  }

  webpackConfig = withAlias(webpackConfig, getAliases(env.projectRoot));

  return webpackConfig;
}
