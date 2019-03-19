const HtmlWebpackPlugin = require('html-webpack-plugin');

const viewports = {
  /**
   * To work with the iPhone X "notch" add `viewport-fit=cover` to the `viewport` meta tag.
   */
  optimizedForiPhoneX:
    'user-scalable=no,initial-scale=1.0001,maximum-scale=1.0001,viewport-fit=cover',
};

const DEFAULT_THEME_COLOR = '#4630EB';
const DEFAULT_DESCRIPTION = 'A Neat Expo App';
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

function createIndexHTMLFromAppJSON({ displayName }, locations) {
  const appJSON = require(locations.appJson);

  const nativeAppManifest = appJSON.expo || appJSON;
  // Is the app.json from expo-cli or react-native-cli
  const isExpoConfig = !!appJSON.expo;
  const { web = {} } = nativeAppManifest;
  const { metatags = {} } = web;
  const { minifyHTML } = web;
  const { twitter = {}, facebook = {}, microsoft = {} } = web;

  const color = nativeAppManifest.primaryColor || DEFAULT_THEME_COLOR;
  const description = nativeAppManifest.description || DEFAULT_DESCRIPTION;

  const openGraphMetatags = {
    // <link rel="canonical" href="absolute-path">
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
    description: nativeAppManifest.description,
    'mobile-web-app-capable': 'yes',
    'google-site-verification': web.googleSiteVerification,
    ...openGraphMetatags,
    ...microsoftMetatags,
    ...twitterMetatags,
    ...appleMetatags,
    ...metatags,
  };

  let minify = DEFAULT_MINIFY;
  /**
   * The user can disable minify with
   * `web.minifyHTML = false || {}`
   */
  if (
    minifyHTML === false ||
    (minifyHTML && typeof minifyHTML === 'object' && !Array.isArray(minifyHTML))
  ) {
    minify = minifyHTML;
  }

  // Generates an `index.html` file with the <script> injected.
  return new HtmlWebpackPlugin({
    // The file to write the HTML to.
    filename: locations.production.indexHtml,
    // The title to use for the generated HTML document.
    title: displayName,
    // Pass a html-minifier options object to minify the output.
    // https://github.com/kangax/html-minifier#options-quick-reference
    minify,
    // Allows to inject meta-tags, e.g. meta: `{viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no'}`.
    meta: metaTags,
    // The `webpack` require path to the template.
    template: locations.template.indexHtml,
  });
}

module.exports = createIndexHTMLFromAppJSON;
