import { getPossibleProjectRoot } from '@expo/config/paths';
import { Rule } from 'webpack';

import { getConfig, getPaths } from '../env';
import { Environment } from '../types';
import createBabelLoader from './createBabelLoader';
import createFontLoader from './createFontLoader';

// Inline resources as Base64 when there is less reason to parallelize their download. The
// heuristic we use is whether the resource would fit within a TCP/IP packet that we would
// send to request the resource.
//
// An Ethernet MTU is usually 1500. IP headers are 20 (v4) or 40 (v6) bytes and TCP
// headers are 40 bytes. HTTP response headers vary and are around 400 bytes. This leaves
// about 1000 bytes for content to fit in a packet.
const imageInlineSizeLimit = parseInt(process.env.IMAGE_INLINE_SIZE_LIMIT || '1000', 10);

/**
 * This is needed for webpack to import static images in JavaScript files.
 * "url" loader works like "file" loader except that it embeds assets
 * smaller than specified limit in bytes as data URLs to avoid requests.
 * A missing `test` is equivalent to a match.
 *
 * @category loaders
 */
// TODO: Bacon: Move SVG
export const imageLoaderRule: Rule = {
  test: /\.(gif|jpe?g|png|svg)$/,
  use: {
    loader: require.resolve('url-loader'),
    options: {
      limit: imageInlineSizeLimit,
      // Interop assets like Metro bundler
      esModule: false,
      name: 'static/media/[name].[hash:8].[ext]',
    },
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
export const fallbackLoaderRule: Rule = {
  loader: require.resolve('file-loader'),
  // Exclude `js` files to keep "css" loader working as it injects
  // its runtime that would otherwise be processed through "file" loader.
  // Also exclude `html` and `json` extensions so they get processed
  // by webpacks internal loaders.

  // Excludes: js, jsx, ts, tsx, html, json
  exclude: [/\.(mjs|[jt]sx?)$/, /\.html$/, /\.json$/],
  options: {
    // Interop assets like Metro bundler
    esModule: false,
    name: 'static/media/[name].[hash:8].[ext]',
  },
};

/**
 * Default CSS loader.
 *
 * @category loaders
 */
export const styleLoaderRule: Rule = {
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
): Rule[] {
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

  return [
    getHtmlLoaderRule(template.folder),
    imageLoaderRule,
    getBabelLoaderRule(env),
    createFontLoader(root, includeModule),
    styleLoaderRule,
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
): Rule {
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

/**
 *
 * @param exclude
 * @category loaders
 */
export function getHtmlLoaderRule(exclude: string): Rule {
  return {
    test: /\.html$/,
    use: [require.resolve('html-loader')],
    exclude,
  };
}
