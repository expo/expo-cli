const HtmlWebpackPlugin = require('html-webpack-plugin');

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

function isObject(val) {
  if (val === null) {
    return false;
  }
  return typeof val === 'function' || typeof val === 'object';
}

function createIndexHTMLFromAppJSON(appManifest, locations) {
  // Is the app.json from expo-cli or react-native-cli
  const { web = {} } = appManifest;
  const { minifyHTML } = web;

  let minify = DEFAULT_MINIFY;
  /**
   * The user can disable minify with
   * `web.minifyHTML = false || {}`
   */
  if (minifyHTML === false || isObject(minifyHTML)) {
    minify = minifyHTML;
  }

  // Generates an `index.html` file with the <script> injected.
  return new HtmlWebpackPlugin({
    // The file to write the HTML to.
    filename: locations.production.indexHtml,
    // The title to use for the generated HTML document.
    title: appManifest.name,
    // Pass a html-minifier options object to minify the output.
    // https://github.com/kangax/html-minifier#options-quick-reference
    minify,
    // The `webpack` require path to the template.
    template: locations.template.indexHtml,
  });
}

module.exports = createIndexHTMLFromAppJSON;
