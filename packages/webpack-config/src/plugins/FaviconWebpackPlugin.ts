import chalk from 'chalk';
import { generateFaviconAsync, IconOptions, ProjectOptions } from 'expo-pwa';
import { Compilation, Compiler } from 'webpack';

import ModifyHtmlWebpackPlugin, { HTMLLinkNode, HTMLPluginData } from './ModifyHtmlWebpackPlugin';

export default class FaviconWebpackPlugin extends ModifyHtmlWebpackPlugin {
  constructor(
    private pwaOptions: ProjectOptions & { links: HTMLLinkNode[] },
    private favicon: IconOptions | null
  ) {
    super();
  }

  async modifyAsync(
    compiler: Compiler,
    compilation: Compilation,
    data: HTMLPluginData
  ): Promise<HTMLPluginData> {
    const logger = compiler.getInfrastructureLogger('chrome-icons-plugin');

    function logNotice(type: string, message: string) {
      logger.log(chalk.magenta(`\u203A ${type}: ${chalk.gray(message)}`));
    }

    function logWarning(type: string, message: string) {
      logger.warn(chalk.yellow(`\u203A ${type}: ${chalk.gray(message)}`));
    }

    if (!this.favicon) {
      logWarning('Favicon', 'No template image found, skipping auto generation...');
      return data;
    }

    const assets = await generateFaviconAsync(this.pwaOptions, this.favicon);

    const links: HTMLLinkNode[] = this.pwaOptions.links.filter(v =>
      v.rel?.split(' ').includes('icon')
    );

    for (const asset of assets) {
      const { attributes = {} } = asset.tag!;
      const faviconExists = links.some(v =>
        v.sizes ? v.sizes === attributes.sizes : v.rel?.includes('shortcut')
      );
      if (faviconExists) {
        logNotice(
          'Favicon',
          `Using custom <link rel="${attributes.rel}"${
            attributes.sizes ? ` sizes="${attributes.sizes}"` : ''
          } .../>`
        );
      } else {
        compilation.assets[asset.asset.path] = {
          source: () => asset.asset.source,
          size: () => asset.asset.source.length,
        };
        data.assetTags.meta.push(asset.tag);
      }
    }
    return data;
  }
}
