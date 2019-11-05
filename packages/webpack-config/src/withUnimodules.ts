import path from 'path';
import { Configuration } from 'webpack';

import createBabelLoader from './loaders/createBabelLoader';
import createFontLoader from './loaders/createFontLoader';
import { ExpoDefinePlugin } from './plugins';
import { Arguments, DevConfiguration, Environment, InputEnvironment } from './types';
import { DEFAULT_ALIAS, getModuleFileExtensions } from './utils';
import getConfig from './utils/getConfig';
import getMode from './utils/getMode';
import { rulesMatchAnyFiles } from './utils/loaders';
import { getPaths, getPublicPaths } from './utils/paths';
import { validateEnvironment } from './utils/validate';

// import ManifestPlugin from 'webpack-manifest-plugin';

// Wrap your existing webpack config with support for Unimodules.
// ex: Storybook `({ config }) => withUnimodules(config)`
export default function withUnimodules(
  inputWebpackConfig: DevConfiguration | Configuration = {},
  env: InputEnvironment = {},
  argv: Arguments = {}
): DevConfiguration | Configuration {
  if (!inputWebpackConfig.module) inputWebpackConfig.module = { rules: [] };
  else if (!inputWebpackConfig.module.rules)
    inputWebpackConfig.module = { ...inputWebpackConfig.module, rules: [] };

  if (!inputWebpackConfig.plugins) inputWebpackConfig.plugins = [];
  if (!inputWebpackConfig.resolve) inputWebpackConfig.resolve = {};
  if (!inputWebpackConfig.output) inputWebpackConfig.output = {};

  // @ts-ignore: We should attempt to use the project root that the other config is already using (used for Gatsby support).
  env.projectRoot = env.projectRoot || inputWebpackConfig.context;

  // Attempt to use the input webpack config mode
  env.mode = env.mode || inputWebpackConfig.mode;

  const environment: Environment = validateEnvironment(env);

  let { supportsFontLoading } = argv;

  // If the args don't specify this then we'll check if the input already supports font loading.
  if (typeof supportsFontLoading === 'undefined') {
    const supportedFonts = ['ttf', 'otf', 'woff', 'woff2', 'eot'];
    const testFontFileNames = supportedFonts.map(ext =>
      path.resolve(environment.projectRoot, `cool-font.${ext}`)
    );
    if (rulesMatchAnyFiles(inputWebpackConfig, testFontFileNames)) {
      supportsFontLoading = false;
    }
  }

  const { platform = 'web' } = env;

  const config = argv.expoConfig || getConfig(environment);

  const locations = env.locations || getPaths(environment.projectRoot);
  const mode = getMode(env);

  const { build: buildConfig = {} } = config.web || {};
  const { babel: babelAppConfig = {} } = buildConfig;

  const babelProjectRoot = babelAppConfig.root || locations.root;

  const babelLoader = createBabelLoader({
    mode,
    platform,
    babelProjectRoot,
    verbose: babelAppConfig.verbose,
    include: babelAppConfig.include,
    use: babelAppConfig.use,
  });

  function reuseOrCreatePublicPaths() {
    if (inputWebpackConfig.output && inputWebpackConfig.output.publicPath) {
      const publicPath = inputWebpackConfig.output.publicPath;
      return {
        publicPath,
        publicUrl: publicPath.endsWith('/') ? publicPath.slice(0, -1) : publicPath,
      };
    }
    return getPublicPaths(environment);
  }

  const { publicPath, publicUrl } = reuseOrCreatePublicPaths();

  inputWebpackConfig.mode = mode;

  inputWebpackConfig.output = {
    // This is the URL that app is served from.
    // We use "/" in development.
    ...inputWebpackConfig.output,
    publicPath,
  };

  inputWebpackConfig.plugins.push(
    // Generate a manifest file which contains a mapping of all asset filenames
    // to their corresponding output file so that tools can pick it up without
    // having to parse `index.html`.
    // new ManifestPlugin({
    //   fileName: 'asset-manifest.json',
    //   publicPath,
    // }),

    // Used for surfacing information related to constants
    new ExpoDefinePlugin({
      mode,
      publicUrl,
      config,
      productionManifestPath: locations.production.manifest,
    })
  );

  const rules = [
    ...inputWebpackConfig.module.rules,

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

  inputWebpackConfig.module = {
    ...inputWebpackConfig.module,
    rules,
  };

  // Support platform extensions like .web.js
  const alias = {
    ...DEFAULT_ALIAS,
    ...(inputWebpackConfig.resolve.alias || {}),
  };

  inputWebpackConfig.resolve = {
    ...inputWebpackConfig.resolve,
    symlinks: false,
    // Add react-native-web aliases
    alias,
    extensions: getModuleFileExtensions('web'),
  };

  // We have to transpile these modules and make them not external too.
  // We have to do this because next.js by default externals all `node_modules`'s js files.
  // Reference:
  // https://github.com/martpie/next-transpile-modules/blob/77450a0c0307e4b650d7acfbc18641ef9465f0da/index.js#L48-L62
  // https://github.com/zeit/next.js/blob/0b496a45e85f3c9aa3cf2e77eef10888be5884fc/packages/next/build/webpack-config.ts#L185-L258
  // `include` function is from https://github.com/expo/expo-cli/blob/3933f3d6ba65bffec2738ece71b62f2c284bd6e4/packages/webpack-config/webpack/loaders/createBabelLoaderAsync.js#L76-L96
  const includeFunc = babelLoader.include as ((path: string) => boolean);
  if (inputWebpackConfig.externals) {
    inputWebpackConfig.externals = (inputWebpackConfig.externals as any).map((external: any) => {
      if (typeof external !== 'function') return external;
      return (ctx: any, req: any, cb: any) => {
        const relPath = path.join('node_modules', req);
        return includeFunc(relPath) ? cb() : external(ctx, req, cb);
      };
    });
  }

  return inputWebpackConfig;
}
