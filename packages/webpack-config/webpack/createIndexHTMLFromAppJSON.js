const HtmlWebpackPlugin = require('html-webpack-plugin');

const viewports = {
  twitter: 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=0',
  /**
   * To work with the iPhone X "notch" add `viewport-fit=cover` to the `viewport` meta tag.
   */
  optimizedForiPhoneX:
    'user-scalable=no,initial-scale=1.0001,maximum-scale=1.0001,viewport-fit=cover',
};

function createIndexHTMLFromAppJSON(locations) {
  const nativeAppManifest = require(locations.appJson);

  const { expo: expoManifest = {} } = nativeAppManifest;
  const { web = {} } = expoManifest;
  const color = expoManifest.primaryColor || '#000000';
  const description = expoManifest.description || 'A Neat Expo App';

  const name = expoManifest.name;
  // TODO: upstream all metatags
  const openGraphMetatags = {
    'og:title': name,
    'og:site_name': name,
    'og:description': description,
    // 'og:type', https://developers.facebook.com/docs/sharing/opengraph#types
    // 'og:image',
    // 'og:url'
  };
  const metaTags = {
    ...openGraphMetatags,

    viewport: viewports.optimizedForiPhoneX,
    description: expoManifest.description || 'A Neat Expo App',
    // 'fb:app_id': expoManifest.facebookAppId,
    'google-site-verification': web.googleSiteVerification,
    'mobile-web-app-capable': 'yes',
    'application-name': name,
    // Windows
    // 'msapplication-navbutton-color': color,
    'msapplication-TileColor': color,
    'msapplication-TileImage': '',

    // WebpackPwaManifest injects these values
    // 'apple-mobile-web-app-capable': 'yes',
    // 'apple-mobile-web-app-status-bar-style': 'white',
    // 'apple-mobile-web-app-title': name,
    // 'theme-color': color,
  };

  // Generates an `index.html` file with the <script> injected.
  return new HtmlWebpackPlugin({
    /**
     * The file to write the HTML to.
     * Default: `'index.html'`.
     */
    filename: locations.production.indexHtml,
    /**
     * The title to use for the generated HTML document.
     * Default: `'Webpack App'`.
     */
    title: expoManifest.name,
    /**
     * Pass a html-minifier options object to minify the output.
     * https://github.com/kangax/html-minifier#options-quick-reference
     * Default: `false`.
     */
    minify: {
      removeComments: true,
      /* Prod */
      collapseWhitespace: true,
      removeRedundantAttributes: true,
      useShortDoctype: true,
      removeEmptyAttributes: true,
      removeStyleLinkTypeAttributes: true,
      keepClosingSlash: true,
      minifyJS: true,
      minifyCSS: true,
      minifyURLs: true,
    },
    /**
     * Adds the given favicon path to the output html.
     * Default: `false`.
     */
    favicon: locations.template.favicon,
    /**
     * Allows to inject meta-tags, e.g. meta: `{viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no'}`.
     * Default: `{}`.
     */
    meta: metaTags,
    /**
     * The `webpack` require path to the template.
     * @see https://github.com/jantimon/html-webpack-plugin/blob/master/docs/template-option.md
     */
    template: locations.template.indexHtml,
  });
}

module.exports = createIndexHTMLFromAppJSON;
