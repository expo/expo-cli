const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ensurePWAConfig } = require('@expo/config');
const WebpackPwaManifest = require('../../../build');
const config = require('../app.json');

function absolute(...pathComponents) {
  return path.resolve(process.cwd(), ...pathComponents);
}

const validatedConfig = ensurePWAConfig(config, absolute, {
  templateIcon: path.resolve(__dirname, '../..', 'icon.png'),
});

module.exports = async () => ({
  entry: path.join(__dirname, '../App.js'),
  output: {
    path: path.join(__dirname, '../output'),
    publicPath: '/',
    filename: 'bundle.js',
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'index.html',
      minify: {
        minifyCSS: true,
        minifyJS: true,
        collapseWhitespace: true,
        collapseInlineTagWhitespace: true,
        preserveLineBreaks: false,
        removeAttributeQuotes: true,
        removeComments: true,
      },
      template: path.join(__dirname, '../../index.html'),
    }),
    new WebpackPwaManifest(validatedConfig, {
      publicPath: '/',
      noResources: false,
      filename: '/manifest.json',
    }),
  ],
});
