import createMetatagsFromConfig from './createMetatagsFromConfig';
import {
  applyTag,
  buildResources,
  generateAppleSplashAndIconTags,
  generateHtmlTags,
  injectResources,
} from './injector';
import validateColors from './validators/Colors';
import validatePresets from './validators/Presets';

const TAP_CMD = 'webpack-pwa-manifest-plugin';
const TAP = 'WebpackPWAManifestPlugin';

function isObject(item) {
  return typeof item === 'object' && !Array.isArray(item) && item !== null;
}

const DEFAULT_OPTIONS = {
  fingerprints: true,
  inject: true,
  ios: false,
  publicPath: null,
  includeDirectory: true,
};

/**
 * Generate a `manifest.json` for your PWA based on the `app.json`.
 * This plugin must be **after HtmlWebpackPlugin**.
 *
 * To test PWAs in chrome visit `chrome://flags#enable-desktop-pwas`
 */
class WebpackPwaManifest {
  constructor(appJson, { noResources, filename, publicPath, HtmlWebpackPlugin }) {
    this.HtmlWebpackPlugin = HtmlWebpackPlugin;
    if (!isObject(appJson)) {
      throw new Error('app.json must be an object');
    }
    const { web = {} } = appJson.expo || appJson || {};
    this.assets = null;
    this.htmlPlugin = false;
    this.config = appJson;

    this.options = {
      ...DEFAULT_OPTIONS,
      publicPath,
      // filename: options.fingerprints ? '[name].[hash].[ext]' : '[name].[ext]',
      noResources,
      filename,
      includeDirectory: false,
      metatags: createMetatagsFromConfig(appJson),
    };

    this.manifest = {
      // PWA
      background_color: web.backgroundColor,
      description: web.description,
      dir: web.dir,
      display: web.display,
      lang: web.lang,
      name: web.name,
      orientation: web.orientation,
      prefer_related_applications: web.preferRelatedApplications,
      related_applications: web.relatedApplications,
      scope: web.scope,
      short_name: web.shortName,
      start_url: web.startUrl,
      theme_color: web.themeColor,
      crossorigin: web.crossorigin,
    };
    if (!noResources) {
      this.manifest.startupImages = web.startupImages;
      this.manifest.icons = web.icons;
    }
    this.validateManifest(this.manifest);
  }

  validateManifest(manifest) {
    validatePresets(manifest, 'dir', 'display', 'orientation', 'crossorigin');
    validateColors(manifest, 'background_color', 'theme_color');
  }

  getManifest() {
    return this.manifest;
  }

  apply(compiler) {
    // Hook into the html-webpack-plugin processing
    // and add the html
    const injectToHtml = async (htmlPluginData, compilation, callback) => {
      if (!this.htmlPlugin) {
        this.htmlPlugin = true;
      }

      const publicPath = this.options.publicPath || compilation.options.output.publicPath;

      // The manifest (this.manifest) should be ready by this point.
      // It will be written to disk here.
      const manifestFile = await buildResources(this, publicPath);

      if (!this.options.inject) {
        callback(null, htmlPluginData);
        return;
      }

      let tags = generateAppleSplashAndIconTags(this.assets);

      for (const metatagName of Object.keys(this.options.metatags)) {
        const content = this.options.metatags[metatagName];
        tags = applyTag(tags, 'meta', {
          name: metatagName,
          content,
        });
      }

      if (manifestFile) {
        const manifestLink = {
          rel: 'manifest',
          href: manifestFile.url,
        };
        if (this.manifest.crossorigin) {
          manifestLink.crossorigin = this.manifest.crossorigin;
        }
        tags = applyTag(tags, 'link', manifestLink);
      }

      const tagsHTML = generateHtmlTags(tags);
      htmlPluginData.html = htmlPluginData.html.replace(/(<\/head>)/i, `${tagsHTML}</head>`);

      callback(null, htmlPluginData);
    };

    // webpack 4
    if (compiler.hooks) {
      compiler.hooks.compilation.tap(TAP, cmpp => {
        // This is set in html-webpack-plugin pre-v4.
        let hook = cmpp.hooks.htmlWebpackPluginAfterHtmlProcessing;
        if (!hook) {
          const HtmlWebpackPlugin = this.HtmlWebpackPlugin || require('html-webpack-plugin');
          hook = HtmlWebpackPlugin.getHooks(cmpp).beforeEmit;
        }

        hook.tapAsync(TAP_CMD, (htmlPluginData, cb) => {
          injectToHtml(htmlPluginData, cmpp, () => {
            injectResources(cmpp, this.assets, cb);
          });
        });
      });
    } else {
      compiler.plugin('compilation', compilation => {
        compilation.plugin(
          'html-webpack-plugin-before-html-processing',
          (htmlPluginData, callback) => injectToHtml(htmlPluginData, compilation, callback)
        );
      });
    }
  }
}

module.exports = WebpackPwaManifest;
