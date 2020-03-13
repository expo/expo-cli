import chalk from 'chalk';
import { Compiler, compilation } from 'webpack';

import {
  IconOptions,
  ProjectOptions,
  generateAppleIconAsync,
  generateSplashAsync,
} from '@expo/pwa';

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

export type ApplePwaMeta = {
  name?: string;
  barStyle?: string;
  isWebAppCapable?: boolean;
  isFullScreen?: boolean;
};

export default class ApplePwaWebpackPlugin extends ModifyHtmlWebpackPlugin {
  constructor(
    private pwaOptions: ProjectOptions & { links: any[] },
    private meta: ApplePwaMeta,
    private icon: IconOptions | null,
    private startupImage: IconOptions | null
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
      const iconAssets = await generateAppleIconAsync(this.pwaOptions, this.icon);

      const links = this.pwaOptions.links
        .filter((v: any) => v.rel === 'apple-touch-icon')
        .map((v: any) => v.sizes);
      for (const asset of iconAssets) {
        const size = asset.tag?.attributes.sizes;
        if (links.includes(size)) {
          console.log(
            chalk.magenta(
              `\u203A Using custom Safari icon: <link rel="apple-touch-icon" sizes="${size}" .../>`
            )
          );
        } else {
          compilation.assets[asset.asset.path] = {
            source: () => asset.asset.source,
            size: () => asset.asset.source.length,
          };
          data.assetTags.meta.push(asset.tag);
        }
      }
    } else {
      console.log(chalk.magenta(`\u203A Skipping Safari PWA icon generation`));
    }

    // Splash screens

    if (this.startupImage) {
      const assets = await generateSplashAsync(this.pwaOptions, this.startupImage);

      const links = this.pwaOptions.links
        .filter((v: any) => v.rel === 'apple-touch-startup-image')
        .map((v: any) => v.media);

      for (const asset of assets) {
        const media = asset.tag?.attributes.media;
        if (links.includes(media)) {
          console.log(
            chalk.magenta(
              `\u203A Using custom Safari icon: <link rel="apple-touch-startup-image" media="${media}" .../>`
            )
          );
        } else {
          compilation.assets[asset.asset.path] = {
            source: () => asset.asset.source,
            size: () => asset.asset.source.length,
          };
          data.assetTags.meta.push(asset.tag);
        }
      }
    } else {
      console.log(chalk.magenta(`\u203A Skipping Safari PWA splash screen generation`));
    }
    return data;
  }
}
