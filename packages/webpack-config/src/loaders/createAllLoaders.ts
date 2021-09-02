import { getPossibleProjectRoot } from '@expo/config/paths';
import { boolish } from 'getenv';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { RuleSetRule } from 'webpack';

import { getConfig, getPaths, getPublicPaths } from '../env';
import { Environment } from '../types';
import createBabelLoader from './createBabelLoader';
// import createFontLoader from './createFontLoader';

const shouldUseSourceMap = boolish('GENERATE_SOURCEMAP', true);

// Inline resources as Base64 when there is less reason to parallelize their download. The
// heuristic we use is whether the resource would fit within a TCP/IP packet that we would
// send to request the resource.
//
// An Ethernet MTU is usually 1500. IP headers are 20 (v4) or 40 (v6) bytes and TCP
// headers are 40 bytes. HTTP response headers vary and are around 400 bytes. This leaves
// about 1000 bytes for content to fit in a packet.
const imageInlineSizeLimit = parseInt(process.env.IMAGE_INLINE_SIZE_LIMIT || '1000', 10);

// TODO: Merge this config once `image/avif` is in the mime-db
// https://github.com/jshttp/mime-db
export const avifImageLoaderRule: RuleSetRule = {
  test: [/\.avif$/],
  type: 'asset',
  mimetype: 'image/avif',
  parser: {
    dataUrlCondition: {
      maxSize: imageInlineSizeLimit,
    },
  },
};

/**
 * This is needed for webpack to import static images in JavaScript files.
 * "url" loader works like "file" loader except that it embeds assets
 * smaller than specified limit in bytes as data URLs to avoid requests.
 * A missing `test` is equivalent to a match.
 *
 * @category loaders
 */
// TODO: Bacon: Move SVG
export const imageLoaderRule: RuleSetRule = {
  test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/, /\.svg$/],
  type: 'asset',
  parser: {
    dataUrlCondition: {
      maxSize: imageInlineSizeLimit,
    },
    // TODO: Interop assets like Metro bundler
    esModule: false,
  },
};

/**
 * "file" loader makes sure those assets get served by WebpackDevServer.
 * When you `import` an asset, you get its (virtual) filename.
 * In production, they would get copied to the `build` folder.
 * This loader doesn't use a "test" so it will catch all modules
 * that fall through the other loaders.
 *
 * @category loaders
 */
export const fallbackLoaderRule: RuleSetRule = {
  // Exclude `js` files to keep "css" loader working as it injects
  // its runtime that would otherwise be processed through "file" loader.
  // Also exclude `html` and `json` extensions so they get processed
  // by webpacks internal loaders.
  exclude: [/^$/, /\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.json$/],
  type: 'asset/resource',
  // options: {
  //   // Interop assets like Metro bundler
  //   esModule: false,
  //   name: 'static/media/[name].[hash:8].[ext]',
  // },
};

/**
 * Default CSS loader.
 *
 * @category loaders
 */
export const styleLoaderRule: RuleSetRule = {
  test: /\.(css)$/,
  use: [require.resolve('style-loader'), require.resolve('css-loader')],
};

/**
 * Create the fallback loader for parsing any unhandled file type.
 *
 * @param env
 * @category loaders
 */
export default function createAllLoaders(
  env: Pick<Environment, 'projectRoot' | 'locations' | 'mode' | 'config' | 'platform' | 'babel'>
): RuleSetRule[] {
  env.projectRoot = env.projectRoot || getPossibleProjectRoot();
  // @ts-ignore
  env.config = env.config || getConfig(env);
  // @ts-ignore
  env.locations = env.locations || getPaths(env.projectRoot, env);

  const { root, includeModule, template } = env.locations;
  const isNative = ['ios', 'android'].includes(env.platform);

  if (isNative) {
    // TODO: Support fallback loader + assets
    return [getHtmlLoaderRule(template.folder), getBabelLoaderRule(env)];
  }

  const isEnvDevelopment = env.mode === 'development';
  const isEnvProduction = env.mode === 'production';
  const { publicPath: publicUrlOrPath } = getPublicPaths(env);

  // common function to get style loaders
  const getStyleLoaders = (cssOptions: RuleSetRule['options']) => {
    const loaders = [
      isEnvDevelopment && require.resolve('style-loader'),
      isEnvProduction && {
        loader: MiniCssExtractPlugin.loader,
        // css is located in `static/css`, use '../../' to locate index.html folder
        // in production `paths.publicUrlOrPath` can be a relative path
        options: publicUrlOrPath.startsWith('.') ? { publicPath: '../../' } : {},
      },
      {
        loader: require.resolve('css-loader'),
        options: cssOptions,
      },
    ].filter(Boolean);

    return loaders;
  };

  return [
    avifImageLoaderRule,
    imageLoaderRule,
    getBabelLoaderRule(env),
    // createFontLoader(root, includeModule),
    {
      test: /\.(css)$/,
      use: getStyleLoaders({
        importLoaders: 1,
        sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
        modules: {
          mode: 'icss',
        },
      }),
      // Don't consider CSS imports dead code even if the
      // containing package claims to have no side effects.
      // Remove this when webpack adds a warning or an error for this.
      // See https://github.com/webpack/webpack/issues/6571
      sideEffects: true,
    },
    // This needs to be the last loader
    fallbackLoaderRule,
  ].filter(Boolean) as Rule[];
}

/**
 * Creates a Rule for loading application code and packages that work with the Expo ecosystem.
 * This method attempts to emulate how Metro loads ES modules in the `node_modules` folder.
 *
 * @param env partial Environment object.
 * @category loaders
 */
export function getBabelLoaderRule(
  env: Pick<Environment, 'projectRoot' | 'config' | 'locations' | 'mode' | 'platform' | 'babel'>
): RuleSetRule {
  env.projectRoot = env.projectRoot || getPossibleProjectRoot();
  // @ts-ignore
  env.config = env.config || getConfig(env);

  env.locations = env.locations || getPaths(env.projectRoot, env);

  const { web: { build: { babel = {} } = {} } = {} } = env.config;

  // TODO: deprecate app.json method in favor of env.babel
  const { root, verbose, include = [], use } = babel;

  const babelProjectRoot = root || env.projectRoot;

  return createBabelLoader({
    projectRoot: env.locations.root,
    mode: env.mode,
    platform: env.platform,
    babelProjectRoot,
    verbose,
    include: [...include, ...(env.babel?.dangerouslyAddModulePathsToTranspile || [])],
    use,
  });
}
