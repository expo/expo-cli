import { Rule } from 'webpack';

import { Environment } from '../types';
import getConfig from '../utils/getConfig';
import getMode from '../utils/getMode';
import { getPathsAsync } from '../utils/paths';
import createBabelLoader from './createBabelLoader';
import createFontLoader from './createFontLoader';

// This is needed for webpack to import static images in JavaScript files.
// "url" loader works like "file" loader except that it embeds assets
// smaller than specified limit in bytes as data URLs to avoid requests.
// A missing `test` is equivalent to a match.
// TODO: Bacon: Move SVG
const imageLoaderConfiguration = {
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

// "file" loader makes sure those assets get served by WebpackDevServer.
// When you `import` an asset, you get its (virtual) filename.
// In production, they would get copied to the `build` folder.
// This loader doesn't use a "test" so it will catch all modules
// that fall through the other loaders.
const fallbackLoaderConfiguration = {
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

export default async function createAllLoadersAsync(env: Environment): Promise<Rule[]> {
  const config = getConfig(env);
  const mode = getMode(env);
  const { platform = 'web' } = env;

  const locations = env.locations || (await getPathsAsync(env.projectRoot));

  const { build: buildConfig = {} } = config.web;
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

  return [
    {
      test: /\.html$/,
      use: [require.resolve('html-loader')],
      exclude: locations.template.folder,
    },
    imageLoaderConfiguration,
    babelLoader,
    createFontLoader({ locations }),
    {
      test: /\.(css)$/,
      use: [require.resolve('style-loader'), require.resolve('css-loader')],
    },
    // This needs to be the last loader
    fallbackLoaderConfiguration,
  ].filter(Boolean);
}
