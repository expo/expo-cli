import HtmlWebpackPlugin from 'html-webpack-plugin';
import { overrideWithPropertyOrConfig } from './utils/config';
import { getPaths } from './utils/paths';
import getConfig from './utils/getConfig';
import getMode from './utils/getMode';
import { Environment } from './types';

const DEFAULT_MINIFY = {
  removeComments: true,
  collapseWhitespace: true,
  removeRedundantAttributes: true,
  useShortDoctype: true,
  removeEmptyAttributes: true,
  removeStyleLinkTypeAttributes: true,
  keepClosingSlash: true,
  minifyJS: true,
  minifyCSS: true,
  minifyURLs: true,
};

export default function createIndexHTMLFromAppJSON(env: Environment): HtmlWebpackPlugin {
  const locations = env.locations || getPaths(env.projectRoot);
  const config = getConfig(env);
  const isProduction = getMode(env) === 'production';

  const { name, build = {} } = config.web;
  /**
   * The user can disable minify with
   * `web.minifyHTML = false || {}`
   */
  const minify = overrideWithPropertyOrConfig(
    isProduction ? build.minifyHTML : false,
    DEFAULT_MINIFY
  );

  // Generates an `index.html` file with the <script> injected.
  return new HtmlWebpackPlugin({
    // The file to write the HTML to.
    filename: locations.production.indexHtml,
    // The title to use for the generated HTML document.
    title: name,
    // Pass a html-minifier options object to minify the output.
    // https://github.com/kangax/html-minifier#options-quick-reference
    minify,
    // The `webpack` require path to the template.
    template: locations.template.indexHtml,
  });
}
