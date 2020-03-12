import path from 'path';

import { getPossibleProjectRoot } from '@expo/config/paths';
import {
  getConfig,
  getMode,
  getModuleFileExtensions,
  getPaths,
  getPublicPaths,
  validateEnvironment,
} from '../env';
import { createBabelLoader, createFontLoader } from '../loaders';
import { ExpoDefinePlugin } from '../plugins';
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
  webpackConfig = withAlias(webpackConfig);

  if (!webpackConfig.module) webpackConfig.module = { rules: [] };
  else if (!webpackConfig.module.rules)
    webpackConfig.module = { ...webpackConfig.module, rules: [] };

  if (!webpackConfig.plugins) webpackConfig.plugins = [];
  if (!webpackConfig.resolve) webpackConfig.resolve = {};
  if (!webpackConfig.output) webpackConfig.output = {};

  // @ts-ignore: We should attempt to use the project root that the other config is already using (used for Gatsby support).
  env.projectRoot = env.projectRoot || webpackConfig.context || getPossibleProjectRoot();

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
  const locations = env.locations || getPaths(environment.projectRoot);

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
      productionManifestPath: locations.production.manifest,
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

  // We have to transpile these modules and make them not external too.
  // We have to do this because next.js by default externals all `node_modules`'s js files.
  // Reference:
  // https://github.com/martpie/next-transpile-modules/blob/77450a0c0307e4b650d7acfbc18641ef9465f0da/index.js#L48-L62
  // https://github.com/zeit/next.js/blob/0b496a45e85f3c9aa3cf2e77eef10888be5884fc/packages/next/build/webpack-config.ts#L185-L258
  // `include` function is from https://github.com/expo/expo-cli/blob/3933f3d6ba65bffec2738ece71b62f2c284bd6e4/packages/webpack-config/webpack/loaders/createBabelLoaderAsync.js#L76-L96
  const includeFunc = babelLoader.include as (path: string) => boolean;
  if (webpackConfig.externals) {
    webpackConfig.externals = (webpackConfig.externals as any).map((external: any) => {
      if (typeof external !== 'function') return external;
      return (ctx: any, req: any, cb: any) => {
        const relPath = path.join('node_modules', req);
        return includeFunc(relPath) ? cb() : external(ctx, req, cb);
      };
    });
  }

  // Add a loose requirement on the ResizeObserver polyfill if it's installed...
  webpackConfig = withEntry(webpackConfig, env, {
    entryPath: 'resize-observer-polyfill/dist/ResizeObserver.global',
  });

  return webpackConfig;
}
