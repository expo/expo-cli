import { ExpoConfig } from '@expo/config';
import { Tapable } from 'tapable';
import webpack from 'webpack';

import { createPWAManifestFromExpoConfig, validateManifest } from './config';
import createMetatagsFromConfig from './createMetatagsFromConfig';
import {
  applyTag,
  buildResourcesAsync,
  generateAppleSplashAndIconTags,
  generateHtmlTags,
} from './injector';
import { HTMLManifestLink, ManifestOptions, ManifestProps } from './WebpackPWAManifestPlugin.types';

const TAP_CMD = 'webpack-pwa-manifest-plugin';
const TAP = 'WebpackPWAManifestPlugin';

/**
 * Generate a `manifest.json` for your PWA based on the `app.json`.
 * This plugin must be **after HtmlWebpackPlugin**.
 *
 * To test PWAs in chrome visit `chrome://flags#enable-desktop-pwas`
 */
export default class WebpackPWAManifest {
  assets: any = null;
  hasHTMLPlugin: boolean = false;
  manifest: ManifestOptions;
  expoConfig: ExpoConfig;
  options: any;
  HtmlWebpackPlugin: any;
  projectRoot: string;

  constructor(
    appJson: ExpoConfig,
    { noResources, filename, publicPath, HtmlWebpackPlugin, projectRoot }: ManifestProps
  ) {
    this.projectRoot = projectRoot || process.cwd();
    this.HtmlWebpackPlugin = HtmlWebpackPlugin;

    this.manifest = createPWAManifestFromExpoConfig(appJson);

    this.expoConfig = appJson;

    this.options = {
      fingerprints: true,
      inject: true,
      ios: false,
      publicPath,
      // filename: options.fingerprints ? '[name].[hash].[ext]' : '[name].[ext]',
      noResources,
      filename,
      includeDirectory: false,
      metatags: createMetatagsFromConfig(appJson),
    };

    if (noResources) {
      delete this.manifest.startupImages;
      delete this.manifest.icons;
    }

    validateManifest(this.manifest);
  }

  getManifest() {
    return this.manifest;
  }

  apply(compiler: webpack.Compiler) {
    // Hook into the html-webpack-plugin processing
    // and add the html
    const injectToHTMLAsync = async (
      htmlPluginData: any,
      compilation: webpack.compilation.Compilation,
      callback: any
    ) => {
      if (!this.hasHTMLPlugin) {
        this.hasHTMLPlugin = true;
      }

      const publicPath = this.options.publicPath || compilation.outputOptions.publicPath;

      // The manifest (this.manifest) should be ready by this point.
      // It will be written to disk here.
      const manifestFile = await buildResourcesAsync(this, publicPath);

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
        const manifestLink: HTMLManifestLink = {
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
      compiler.hooks.compilation.tap(TAP, compilation => {
        // This is set in html-webpack-plugin pre-v4.
        // @ts-ignore
        let hook = compilation.hooks.htmlWebpackPluginAfterHtmlProcessing;
        if (!hook) {
          const HtmlWebpackPlugin = this.HtmlWebpackPlugin || require('html-webpack-plugin');
          hook = HtmlWebpackPlugin.getHooks(compilation).beforeEmit;
        }

        hook.tapAsync(TAP_CMD, (htmlPluginData: any, callback: (...props: any[]) => void) => {
          injectToHTMLAsync(htmlPluginData, compilation, () => {
            if (this.assets) {
              for (let asset of this.assets) {
                compilation.assets[asset.output] = {
                  source: () => asset.source,
                  size: () => asset.size,
                };
              }
            }
            callback();
          });
        });
      });
    } else {
      compiler.plugin('compilation', compilation => {
        compilation.plugin(
          'html-webpack-plugin-before-html-processing',
          (htmlPluginData: any, callback: (_this: Tapable, ...args: any[]) => void) =>
            injectToHTMLAsync(htmlPluginData, compilation, callback)
        );
      });
    }
  }
}

export { WebpackPWAManifest };
