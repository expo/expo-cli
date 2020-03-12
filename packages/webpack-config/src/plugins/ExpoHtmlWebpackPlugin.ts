import OriginalHtmlWebpackPlugin from 'html-webpack-plugin';

import { Environment } from '../types';
import { getConfig, getMode, getPaths } from '../env';
import { overrideWithPropertyOrConfig } from '../utils';

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

/**
 * Generates an `index.html` file with the <script> injected.
 *
 * @category plugins
 */
export default class HtmlWebpackPlugin extends OriginalHtmlWebpackPlugin {
  constructor(env: Environment) {
    const locations = env.locations || getPaths(env.projectRoot);
    const config = getConfig(env);
    const isProduction = getMode(env) === 'production';

    /**
     * The user can disable minify with
     * `web.minifyHTML = false || {}`
     */
    const minify = overrideWithPropertyOrConfig(
      isProduction ? config.web?.build?.minifyHTML : false,
      DEFAULT_MINIFY
    );

    super({
      // The file to write the HTML to.
      filename: locations.production.indexHtml,
      // The title to use for the generated HTML document.
      title: config.web?.name,
      // Pass a html-minifier options object to minify the output.
      // https://github.com/kangax/html-minifier#options-quick-reference
      minify,
      // The `webpack` require path to the template.
      template: locations.template.indexHtml,
    });
  }
}
