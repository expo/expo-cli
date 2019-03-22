import validatePresets from './validators/Presets';
import validateColors from './validators/Colors';
import {
  buildResources,
  injectResources,
  generateHtmlTags,
  generateAppleTags,
  generateMaskIconLink,
  applyTag,
} from './injector';
import createMetatagsFromConfig from './createMetatagsFromConfig';

const TAP_CMD = 'webpack-pwa-manifest-plugin';
const TAP = 'WebpackPWAManifestPlugin';

function isObject(item) {
  return typeof item === 'object' && !Array.isArray(item) && item !== null;
}

/**
 * Generate a `manifest.json` for your PWA based on the `app.json`.
 * This plugin must be **after HtmlWebpackPlugin**.
 *
 * To test PWAs in chrome visit `chrome://flags#enable-desktop-pwas`
 */
class WebpackPwaManifest {
  constructor(appJson, options) {
    if (!isObject(appJson)) {
      throw new Error('app.json must be an object');
    }
    const { web = {} } = appJson.expo || appJson || {};

    const metatags = createMetatagsFromConfig(appJson);

    this._parseOptions(
      {
        ...options,
        filename: options.filename,
        includeDirectory: false,
        metatags,
      },
      {
        ...web,
        // PWA
        background_color: web.backgroundColor,
        description: web.description,
        dir: web.dir,
        display: web.display,
        icons: web.icons,
        startupImages: web.startupImages,
        lang: web.lang,
        name: web.name,
        orientation: web.orientation,
        prefer_related_applications: web.preferRelatedApplications,
        related_applications: web.relatedApplications,
        scope: web.scope,
        short_name: web.shortName,
        start_url: web.startUrl,
        theme_color: web.themeColor,
        ios: {
          'apple-mobile-web-app-status-bar-style': web.barStyle,
        },
        crossorigin: web.crossorigin,
      }
    );
  }

  _parseOptions(options, manifest) {
    validatePresets(manifest, 'dir', 'display', 'orientation', 'crossorigin');
    validateColors(manifest, 'background_color', 'theme_color');
    this.assets = null;
    this.htmlPlugin = false;
    // const shortName = options.short_name || options.name || 'App';
    // fingerprints is true by default, but we want it to be false even if users
    // set it to undefined or null.
    if (!options.hasOwnProperty('fingerprints')) {
      options.fingerprints = true;
    }
    this.options = {
      filename: options.fingerprints ? '[name].[hash].[ext]' : '[name].[ext]',
      inject: true,
      fingerprints: true,
      ios: false,
      publicPath: null,
      includeDirectory: true,
      crossorigin: null,
      ...options,
      ...manifest,
    };
    this.manifest = manifest;
  }

  getManifest() {
    return this.manifest;
  }

  apply(compiler) {
    const self = this;

    // Hook into the html-webpack-plugin processing
    // and add the html
    const injectToHtml = function(htmlPluginData, compilation, callback) {
      if (!self.htmlPlugin) {
        self.htmlPlugin = true;
      }
      const publicPath = self.options.publicPath || compilation.options.output.publicPath;
      buildResources(self, publicPath, () => {
        if (!self.options.inject) {
          callback(null, htmlPluginData);
          return;
        }

        let tags = generateAppleTags(self.options, self.assets);

        for (const metatagName of Object.keys(self.options.metatags)) {
          const content = self.options.metatags[metatagName];
          tags = applyTag(tags, 'meta', {
            name: metatagName,
            content,
          });
        }

        const manifestLink = {
          rel: 'manifest',
          href: self.manifest.url,
        };
        if (self.options.crossorigin) {
          manifestLink.crossorigin = self.options.crossorigin;
        }
        applyTag(tags, 'link', manifestLink);
        tags = generateMaskIconLink(tags, self.assets);

        const tagsHTML = generateHtmlTags(tags);
        htmlPluginData.html = htmlPluginData.html.replace(/(<\/head>)/i, `${tagsHTML}</head>`);

        callback(null, htmlPluginData);
      });
    };

    // webpack 4
    if (compiler.hooks) {
      compiler.hooks.compilation.tap(TAP, function(cmpp) {
        // This is set in html-webpack-plugin pre-v4.
        let hook = cmpp.hooks.htmlWebpackPluginAfterHtmlProcessing;
        if (!hook) {
          const HtmlWebpackPlugin = require('html-webpack-plugin');
          hook = HtmlWebpackPlugin.getHooks(cmpp).beforeEmit;
        }

        hook.tapAsync(TAP_CMD, (htmlPluginData, cb) => {
          injectToHtml(htmlPluginData, cmpp, () => {
            injectResources(cmpp, self.assets, cb);
          });
        });
      });
    } else {
      compiler.plugin('compilation', function(compilation) {
        compilation.plugin(
          'html-webpack-plugin-before-html-processing',
          (htmlPluginData, callback) => injectToHtml(htmlPluginData, compilation, callback)
        );
      });
    }
  }
}

module.exports = WebpackPwaManifest;
