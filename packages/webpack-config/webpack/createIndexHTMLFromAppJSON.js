const HtmlWebpackPlugin = require('html-webpack-plugin');

const viewports = {
  /**
   * To work with the iPhone X "notch" add `viewport-fit=cover` to the `viewport` meta tag.
   */
  optimizedForiPhoneX: 'width=device-width,initial-scale=1,minimum-scale=1,viewport-fit=cover',
  // 'user-scalable=no,initial-scale=1.0001,maximum-scale=1.0001,viewport-fit=cover',
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

const ogTags = [
  // <link rel="canonical" href="absolute-path">
  { name: 'og:title', propNames: ['title'] },
  { name: 'og:site_name', propNames: ['siteName'] },
  { name: 'og:description', propNames: ['description'] },
  { name: 'article:author', propNames: ['author'] },
  { name: 'og:image', propNames: ['image'] },
  { name: 'og:image:width', propNames: ['imageWidth'] },
  { name: 'og:image:height', propNames: ['imageHeight'] },
  { name: 'og:locale', propNames: ['locale'] },
  // https://developers.facebook.com/docs/sharing/opengraph#types
  { name: 'og:type', propNames: ['type'], fallback: 'website' },
  { name: 'og:url', propNames: ['url'] },
];

const twitterTags = [
  { name: 'twitter:card', propNames: ['card'] },
  { name: 'twitter:title', propNames: ['title'] },
  { name: 'twitter:description', propNames: ['description'] },
  { name: 'twitter:site', propNames: ['site'] },
  { name: 'twitter:image', propNames: ['image'] },
  { name: 'twitter:creator', propNames: ['creator'] },
];

const msTags = [
  // 'msapplication-window': `width=${microsoft.width};height=${microsoft.height}`,
  { name: 'mssmarttagspreventparsing', propNames: ['preventParsing'] },
  { name: 'msapplication-navbutton-color', propNames: ['buttonColor'] },
  { name: 'application-name', propNames: ['appName'] },
  { name: 'msapplication-tooltip', propNames: ['tooltip'] },
  { name: 'msapplication-TileColor', propNames: ['tileColor'] },
  { name: 'msapplication-TileImage', propNames: ['tileImage'] },
];

function possibleProperty(input, possiblePropertyNames, fallback) {
  for (const propertyName of possiblePropertyNames) {
    if (input[propertyName] !== undefined) {
      return input[propertyName];
    }
  }
  return fallback;
}

function populateMetatagObject(schema, input) {
  let output = {};
  for (const item of schema) {
    // Check the list of propNames and the tag name
    const value = possibleProperty(input, item.propNames.concat([item.name]), item.fallback);
    if (value !== undefined) {
      output[item.name] = value;
    }
  }
  return output;
}

function createIndexHTMLFromAppJSON({ displayName }, locations) {
  const appJson = require(locations.appJson);

  const nativeAppManifest = appJson.expo || appJson;
  // Is the app.json from expo-cli or react-native-cli
  const isExpoConfig = !!appJson.expo;
  const { web = {} } = nativeAppManifest;
  const { metatags = {} } = web;
  const { minifyHTML } = web;
  const { twitter = {}, facebook = {}, microsoft = {} } = web;

  const color = nativeAppManifest.primaryColor || DEFAULT_THEME_COLOR;
  const description = nativeAppManifest.description || DEFAULT_DESCRIPTION;

  const openGraphMetatags = populateMetatagObject(ogTags, facebook);
  const twitterMetatags = populateMetatagObject(twitterTags, twitter);
  const microsoftMetatags = populateMetatagObject(msTags, microsoft);

  const appleMetatags = {
    'format-detection': 'telephone=no',
    'apple-touch-fullscreen': 'yes',
  };

  const metaTags = {
    viewport: viewports.optimizedForiPhoneX,
    description,
    'mobile-web-app-capable': 'yes',
    ...openGraphMetatags,
    ...microsoftMetatags,
    ...twitterMetatags,
    ...appleMetatags,
    ...metatags,
  };

  if (web.googleSiteVerification !== undefined) {
    metaTags['google-site-verification'] = web.googleSiteVerification;
  }

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
