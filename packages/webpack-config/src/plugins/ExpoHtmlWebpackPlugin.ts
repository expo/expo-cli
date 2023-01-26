import chalk from 'chalk';
import OriginalHtmlWebpackPlugin from 'html-webpack-plugin';

import { getConfig, getMode, getPaths } from '../env';
import { Environment } from '../types';
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
  constructor(env: Environment, templateHtmlData?: any) {
    const locations = env.locations || getPaths(env.projectRoot, env);
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

    const meta: Record<string, any> = {};

    if (templateHtmlData && templateHtmlData.querySelectorAll) {
      // @ts-ignore
      const templateMeta = templateHtmlData.querySelectorAll('meta');

      // Ensure there is no viewport meta tag in the default `web/index.html`.
      // Because the viewport tag has been moved into the template, this will
      // ensure that legacy `web/index.html`s get a viewport meta tag added to them.
      if (!templateMeta.some((node: any) => node.getAttribute('name') === 'viewport')) {
        console.warn(
          chalk.bgYellow.black(
            'Warning: No viewport meta tag is defined in the <head /> of `web/index.html`. Please update your `web/index.html` to include one. The default value is:\n\n'
          ) +
            chalk.magenta(
              '<meta name="viewport" content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1.00001,viewport-fit=cover">'
            )
        );
        meta.viewport =
          'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1.00001, viewport-fit=cover';
      }
      // Meta tag to define a suggested color that browsers should use to customize the display of the page or of the surrounding user interface.
      // The meta tag overrides any theme-color set in the web app manifest.
      if (
        config.web?.themeColor &&
        !templateMeta.some((node: any) => node.getAttribute('name') === 'theme-color')
      ) {
        meta['theme-color'] = config.web?.themeColor;
      }

      if (
        config.web?.description &&
        !templateMeta.some((node: any) => node.getAttribute('name') === 'description')
      ) {
        meta['description'] = config.web?.description;
      }
    }

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
      meta,
    });
  }
}
