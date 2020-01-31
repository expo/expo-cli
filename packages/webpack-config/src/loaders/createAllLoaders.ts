import { Rule } from 'webpack';

import { ExpoConfig } from '@expo/config';
import { Environment, FilePaths, Mode } from '../types';
import { getConfig, getMode, getPaths } from '../env';
import createBabelLoader from './createBabelLoader';
import createFontLoader from './createFontLoader';
import createWorkerLoader from './createWorkerLoader';

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
      // Inline resources as Base64 when there is less reason to parallelize their download. The
      // heuristic we use is whether the resource would fit within a TCP/IP packet that we would
      // send to request the resource.
      //
      // An Ethernet MTU is usually 1500. IP headers are 20 (v4) or 40 (v6) bytes and TCP
      // headers are 40 bytes. HTTP response headers vary and are around 400 bytes. This leaves
      // about 1000 bytes for content to fit in a packet.
      limit: 1000,
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
    name: 'static/media/[name].[hash:8].[ext]',
  },
};

/**
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
export default function createAllLoaders(env: Environment): Rule[] {
  const config = getConfig(env);
  const mode = getMode(env);
  const { platform = 'web' } = env;

  const locations = env.locations || getPaths(env.projectRoot);

  return getAllLoaderRules(config, mode, locations, platform);
}

/**
 *
 * @param env
 * @category loaders
 */
export function getBabelLoaderRuleFromEnv(env: Environment): Rule {
  const config = getConfig(env);
  const mode = getMode(env);
  const { platform = 'web' } = env;

  const locations = env.locations || getPaths(env.projectRoot);

  return getBabelLoaderRule(locations.root, config, mode, platform);
}

/**
 *
 * @param projectRoot
 * @param param1
 * @param mode
 * @param platform
 * @category loaders
 */
export function getBabelLoaderRule(
  projectRoot: string,
  { web: { build: { babel = {} } = {} } = {} }: ExpoConfig,
  mode: Mode,
  platform: string = 'web'
): Rule {
  const { root, verbose, include, use } = babel;

  const babelProjectRoot = root || projectRoot;

  return createBabelLoader({
    mode,
    platform,
    babelProjectRoot,
    verbose,
    include,
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

/**
 *
 * @param config
 * @param mode
 * @param param2
 * @param platform
 * @category loaders
 */
export function getAllLoaderRules(
  config: ExpoConfig,
  mode: Mode,
  { root, includeModule, template }: FilePaths,
  platform: string = 'web'
): Rule[] {
  return [
    getHtmlLoaderRule(template.folder),
    imageLoaderRule,
    getBabelLoaderRule(root, config, mode, platform),
    createWorkerLoader(),
    createFontLoader(root, includeModule),
    styleLoaderRule,
    // This needs to be the last loader
    fallbackLoaderRule,
  ].filter(Boolean);
}
