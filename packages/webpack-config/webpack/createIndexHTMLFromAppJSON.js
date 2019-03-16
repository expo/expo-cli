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
  const { metatags = {} } = web;
  const { twitter = {}, facebook = {}, microsoft = {} } = web;

  const color = expoManifest.primaryColor || '#000000';
  const description = expoManifest.description || 'A Neat Expo App';

  const name = expoManifest.name;

  // TODO: upstream all metatags
  const openGraphMetatags = {
    // <link rel="canonical" href="Your absolute web path">
    'og:title': facebook.title,
    'og:site_name': facebook.siteName,
    'og:description': facebook.description,
    'article:author': facebook.author,
    'og:image': facebook.image,
    'og:image:width': facebook.imageWidth,
    'og:image:height': facebook.imageHeight,
    'og:locale': facebook.locale,
    // https://developers.facebook.com/docs/sharing/opengraph#types
    'og:type': facebook.type || 'website',
    'og:url': facebook.url,
  };

  const twitterMetatags = {
    'twitter:card': twitter.card,
    'twitter:title': twitter.title,
    'twitter:description': twitter.description,
    'twitter:site': twitter.site,
    'twitter:image': twitter.image,
    'twitter:creator': twitter.creator,
  };

  const microsoftMetatags = {
    'application-name': microsoft.appName,
    mssmarttagspreventparsing: microsoft.preventParsing,
    'msapplication-window': `width=${microsoft.width};height=${microsoft.height}`,
    'msapplication-navbutton-color': microsoft.buttonColor || color,
    'msapplication-tooltip': microsoft.tooltip,
    'msapplication-TileColor': microsoft.tileColor,
    'msapplication-TileImage': microsoft.tileImage,
  };

  const appleMetatags = {
    'format-detection': 'telephone=no',
    'apple-touch-fullscreen': 'yes',
  };

  const metaTags = {
    viewport: viewports.optimizedForiPhoneX,
    description: expoManifest.description,
    'mobile-web-app-capable': 'yes',
    'google-site-verification': web.googleSiteVerification,
    ...openGraphMetatags,
    ...microsoftMetatags,
    ...twitterMetatags,
    ...appleMetatags,
    ...metatags,
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
