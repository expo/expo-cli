import chalk from 'chalk';
import { Compiler, compilation } from 'webpack';

import { generateAppleIconAsync, generateSplashAsync } from '../../../pwa/build/Webpack';

import ModifyHtmlWebpackPlugin from './ModifyHtmlWebpackPlugin';

function metaTag(name: string, content: string): any {
  return {
    tagName: 'meta',
    voidTag: true,
    attributes: {
      name,
      content,
    },
  };
}

export default class ApplePwaWebpackPlugin extends ModifyHtmlWebpackPlugin {
  constructor(
    private pwaOptions: any,
    private meta: {
      name?: string;
      barStyle?: string;
      isWebAppCapable?: boolean;
      isFullScreen?: boolean;
    },
    private icon: string | undefined,
    private startupImages: any[]
  ) {
    super();
  }

  async modifyAsync(
    compiler: Compiler,
    compilation: compilation.Compilation,
    data: any
  ): Promise<any> {
    // Meta
    if (this.meta.isWebAppCapable) {
      data.assetTags.meta.push(metaTag('apple-mobile-web-app-capable', 'yes'));
      data.assetTags.meta.push(metaTag('mobile-web-app-capable', 'yes'));

      console.log(chalk.magenta(`\u203A Enabling PWA support`));
    }
    if (this.meta.isFullScreen) {
      data.assetTags.meta.push(metaTag('apple-touch-fullscreen', 'yes'));
    }
    if (this.meta.name) {
      data.assetTags.meta.push(metaTag('apple-mobile-web-app-title', this.meta.name));
    }
    if (this.meta.barStyle) {
      data.assetTags.meta.push(
        metaTag('apple-mobile-web-app-status-bar-style', this.meta.barStyle)
      );
    }

    // App Icon
    if (this.icon) {
      const iconAssets = await generateAppleIconAsync(this.pwaOptions, {
        src: this.icon,
        backgroundColor: 'transparent',
        resizeMode: 'contain',
      });

      for (const asset of iconAssets) {
        compilation.assets[asset.asset.path] = {
          source: () => asset.asset.source,
          size: () => asset.asset.source.length,
        };
        data.assetTags.meta.push(asset.tag);
      }
    } else {
      console.log(chalk.magenta(`\u203A Skipping Safari PWA icon generation`));
    }

    // Splash screens

    const [image] = this.startupImages;

    const assets = await generateSplashAsync(this.pwaOptions, {
      src: image.src,
      backgroundColor: image.color,
      resizeMode: image.resizeMode,
    });

    for (const asset of assets) {
      compilation.assets[asset.asset.path] = {
        source: () => asset.asset.source,
        size: () => asset.asset.source.length,
      };
      data.assetTags.meta.push(asset.tag);
    }
    return data;
  }
}
