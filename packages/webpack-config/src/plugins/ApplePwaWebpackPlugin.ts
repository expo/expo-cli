import chalk from 'chalk';
import { generateAppleIconAsync, generateSplashAsync, IconOptions, ProjectOptions } from 'expo-pwa';
import { Compilation, Compiler, sources } from 'webpack';

import ModifyHtmlWebpackPlugin, { HTMLLinkNode, HTMLPluginData } from './ModifyHtmlWebpackPlugin';

export type ApplePwaMeta = {
  name?: string;
  barStyle?: string;
  isWebAppCapable?: boolean;
  isFullScreen?: boolean;
};

export default class ApplePwaWebpackPlugin extends ModifyHtmlWebpackPlugin {
  constructor(
    private pwaOptions: ProjectOptions & { links: HTMLLinkNode[]; meta: HTMLLinkNode[] },
    private meta: ApplePwaMeta,
    private icon: IconOptions | null,
    private startupImage: IconOptions | null
  ) {
    super();
  }

  async modifyAsync(
    compiler: Compiler,
    compilation: Compilation,
    data: HTMLPluginData
  ): Promise<HTMLPluginData> {
    // Meta

    const hasMetaTagWithName = (name: string): boolean => {
      return this.pwaOptions.meta.some(v => v.name === name);
    };

    if (this.meta.isWebAppCapable) {
      if (!hasMetaTagWithName('mobile-web-app-capable')) {
        data.assetTags.meta.push(metaTag('mobile-web-app-capable', 'yes'));
      }
      if (!hasMetaTagWithName('apple-mobile-web-app-capable')) {
        data.assetTags.meta.push(metaTag('apple-mobile-web-app-capable', 'yes'));
      }
    }
    if (this.meta.isFullScreen && !hasMetaTagWithName('apple-touch-fullscreen')) {
      data.assetTags.meta.push(metaTag('apple-touch-fullscreen', 'yes'));
    }
    if (this.meta.name && !hasMetaTagWithName('apple-mobile-web-app-title')) {
      data.assetTags.meta.push(metaTag('apple-mobile-web-app-title', this.meta.name));
    }
    if (this.meta.barStyle && !hasMetaTagWithName('apple-mobile-web-app-status-bar-style')) {
      data.assetTags.meta.push(
        metaTag('apple-mobile-web-app-status-bar-style', this.meta.barStyle)
      );
    }

    const logger = compiler.getInfrastructureLogger('apple-pwa-plugin');

    function logNotice(type: string, message: string) {
      logger.log(chalk.magenta(`\u203A ${type}: ${chalk.gray(message)}`));
    }

    function logWarning(type: string, message: string) {
      logger.warn(chalk.yellow(`\u203A ${type}: ${chalk.gray(message)}`));
    }
    // App Icon
    if (this.icon) {
      const links: string[] = this.pwaOptions.links
        .filter(v => v.rel === 'apple-touch-icon')
        .map(v => v.sizes!);

      const targetSizes = [180];
      const requiredSizes: number[] = [];

      for (const size of targetSizes) {
        const sizes = `${size}x${size}`;
        if (links.includes(sizes)) {
          logNotice(
            'Safari Icons',
            `Using custom <link rel="apple-touch-icon" sizes="${sizes}" .../>`
          );
        } else {
          requiredSizes.push(size);
        }
      }

      const iconAssets = await generateAppleIconAsync(this.pwaOptions, this.icon, {
        sizes: requiredSizes,
      });

      for (const asset of iconAssets) {
        const size = asset.tag?.attributes.sizes;
        if (size && links.includes(size)) {
          logNotice(
            'Safari Icons',
            `Using custom <link rel="apple-touch-icon" sizes="${size}" .../>`
          );
        } else {
          compilation.emitAsset(asset.asset.path, new sources.RawSource(asset.asset.source));

          // compilation.assets[asset.asset.path] = {
          //   source: () => asset.asset.source,
          //   size: () => asset.asset.source.length,
          // };
          data.assetTags.meta.push(asset.tag);
        }
      }
    } else {
      logWarning('Safari Icons', `No template image found, skipping auto generation...`);
    }

    // Splash screens

    if (this.startupImage) {
      const assets = await generateSplashAsync(this.pwaOptions, this.startupImage);

      const links: string[] = this.pwaOptions.links
        .filter(v => v.rel === 'apple-touch-startup-image')
        .map(v => v.media!);

      for (const asset of assets) {
        const media = asset.tag?.attributes.media;
        if (media && links.includes(media)) {
          logNotice(
            'Safari Splash Screens',
            `Using custom <link rel="apple-touch-startup-image" media="${media}" ... />`
          );
        } else {
          compilation.emitAsset(asset.asset.path, new sources.RawSource(asset.asset.source));
          // compilation.assets[asset.asset.path] = {
          //   source: () => asset.asset.source,
          //   size: () => asset.asset.source.length,
          // };
          data.assetTags.meta.push(asset.tag);
        }
      }
    } else {
      logWarning('Safari Splash Screens', `No template image found, skipping auto generation...`);
    }
    return data;
  }
}

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
