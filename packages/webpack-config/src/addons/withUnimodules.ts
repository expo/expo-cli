import { getPossibleProjectRoot } from '@expo/config/paths';
import path from 'path';
import { ExternalsFunctionElement } from 'webpack';

import {
  getAliases,
  getConfig,
  getMode,
  getModuleFileExtensions,
  getPaths,
  getPublicPaths,
  validateEnvironment,
} from '../env';
import { createBabelLoader, createFontLoader } from '../loaders';
// importing from "../plugins" will cause dependency issues with next-adapter
// other plugins import webpack4 packages which error on load when next-adapter uses webpack5
import ExpoDefinePlugin from '../plugins/ExpoDefinePlugin';
import { AnyConfiguration, Arguments, Environment, InputEnvironment } from '../types';
import { rulesMatchAnyFiles } from '../utils';
import withAlias from './withAlias';
import withEntry from './withEntry';

/**
 * Wrap your existing webpack config with support for Unimodules.
 * ex: Storybook `({ config }) => withUnimodules(config)`
 *
 * @param webpackConfig Optional existing Webpack config to modify.
 * @param env Optional Environment options for configuring what features the Webpack config supports.
 * @param argv
 * @category addons
 */
export default function withUnimodules(
  webpackConfig: AnyConfiguration = {},
  env: InputEnvironment = {},
  argv: Arguments = {}
): AnyConfiguration {
  // @ts-ignore: We should attempt to use the project root that the other config is already using (used for Gatsby support).
  env.projectRoot = env.projectRoot || webpackConfig.context || getPossibleProjectRoot();

  // Add native react aliases
  webpackConfig = withAlias(webpackConfig, getAliases(env.projectRoot));

  const isWebpack5 = argv.webpack5;

  if (!webpackConfig.module) webpackConfig.module = { rules: [] };
  else if (!webpackConfig.module.rules)
    webpackConfig.module = { ...webpackConfig.module, rules: [] };

  if (!webpackConfig.plugins) webpackConfig.plugins = [];
  if (!webpackConfig.resolve) webpackConfig.resolve = {};
  if (!webpackConfig.output) webpackConfig.output = {};

  // Attempt to use the input webpack config mode
  env.mode = env.mode || webpackConfig.mode;

  const environment: Environment = validateEnvironment(env);

  let { supportsFontLoading } = argv;

  // If the args don't specify this then we'll check if the input already supports font loading.
  if (typeof supportsFontLoading === 'undefined') {
    const supportedFonts = ['ttf', 'otf', 'woff', 'woff2', 'eot'];
    const testFontFileNames = supportedFonts.map(ext =>
      path.resolve(environment.projectRoot, `cool-font.${ext}`)
    );
    if (rulesMatchAnyFiles(webpackConfig, testFontFileNames)) {
      supportsFontLoading = false;
    }
  }

  const { platform = 'web' } = env;

  const config = argv.expoConfig || getConfig(environment);

  const mode = getMode(env);
  const locations = env.locations || getPaths(environment.projectRoot, environment);

  const { build: buildConfig = {} } = config.web || {};
  const { babel: babelAppConfig = {} } = buildConfig;

  const babelProjectRoot = babelAppConfig.root || locations.root;

  const babelLoader = createBabelLoader({
    projectRoot: locations.root,
    mode,
    platform,
    babelProjectRoot,
    verbose: babelAppConfig.verbose,
    include: [
      ...(babelAppConfig.include || []),
      ...(env.babel?.dangerouslyAddModulePathsToTranspile || []),
    ],
    use: babelAppConfig.use,
  });

  function reuseOrCreatePublicPaths() {
    if (webpackConfig.output && webpackConfig.output.publicPath) {
      const publicPath = webpackConfig.output.publicPath;
      return {
        publicPath,
        publicUrl: publicPath.endsWith('/') ? publicPath.slice(0, -1) : publicPath,
      };
    }
    return getPublicPaths(environment);
  }

  const { publicPath, publicUrl } = reuseOrCreatePublicPaths();

  webpackConfig.mode = mode;

  webpackConfig.output = {
    // This is the URL that app is served from.
    // We use "/" in development.
    ...webpackConfig.output,
    publicPath,
  };

  webpackConfig.plugins.push(
    // Used for surfacing information related to constants
    new ExpoDefinePlugin({
      mode,
      publicUrl,
      config,
    })
  );

  const rules = [
    ...webpackConfig.module.rules,

    // TODO: Bacon: Auto remove this loader
    {
      test: /\.html$/,
      use: ['html-loader'],
      exclude: locations.template.folder,
    },
    // Process application code with Babel.
    babelLoader,

    supportsFontLoading && createFontLoader(locations.root, locations.includeModule),
  ].filter(Boolean);

  webpackConfig.module = {
    ...webpackConfig.module,
    rules,
  };

  webpackConfig.resolve = {
    ...webpackConfig.resolve,
    symlinks: false,
    // Support platform extensions like .web.js
    extensions: getModuleFileExtensions('web'),
  };

  // Transpile and remove expo modules from Next.js externals.
  const includeFunc = babelLoader.include as (path: string) => boolean;
  webpackConfig = ignoreExternalModules(webpackConfig, includeFunc, isWebpack5);

  // Add a loose requirement on the ResizeObserver polyfill if it's installed...
  webpackConfig = withEntry(webpackConfig, env, {
    entryPath: 'resize-observer-polyfill/dist/ResizeObserver.global',
  });

  return webpackConfig;
}

/**
 * We have to transpile these modules and make them not external too.
 * We have to do this because next.js by default externals all `node_modules`'s js files.
 *
 * Reference:
 * - https://github.com/martpie/next-transpile-modules/blob/77450a0c0307e4b650d7acfbc18641ef9465f0da/index.js#L48-L62
 * - https://github.com/zeit/next.js/blob/0b496a45e85f3c9aa3cf2e77eef10888be5884fc/packages/next/build/webpack-config.ts#L185-L258
 * - `include` function is from https://github.com/expo/expo-cli/blob/3933f3d6ba65bffec2738ece71b62f2c284bd6e4/packages/webpack-config/webpack/loaders/createBabelLoaderAsync.js#L76-L96
 *
 * @param webpackConfig Config to be modified
 * @param shouldIncludeModule A method that returns a boolean when the input module should be transpiled and externed.
 */
export function ignoreExternalModules(
  webpackConfig: AnyConfiguration,
  shouldIncludeModule: (path: string) => boolean,
  isWebpack5: boolean
): AnyConfiguration {
  if (!webpackConfig.externals) {
    return webpackConfig;
  }
  if (!Array.isArray(webpackConfig.externals)) {
    webpackConfig.externals = [webpackConfig.externals];
  }
  webpackConfig.externals = webpackConfig.externals.map(external => {
    if (typeof external !== 'function') {
      return external;
    }

    if (isWebpack5) {
      return (ctx => {
        const relPath = path.join('node_modules', ctx.request);
        return shouldIncludeModule(relPath) ? undefined : (external as (content: any) => any)(ctx);
      }) as ExternalsFunctionElement;
    }

    return ((ctx, req, cb) => {
      const relPath = path.join('node_modules', req);
      return shouldIncludeModule(relPath) ? cb() : external(ctx, req, cb);
    }) as ExternalsFunctionElement;
  });

  return webpackConfig;
}
