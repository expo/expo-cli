import { Compiler, compilation } from 'webpack';

import { IconOptions, ProjectOptions, generateFaviconAsync } from '@expo/pwa';
import chalk from 'chalk';
import ModifyHtmlWebpackPlugin, { HTMLPluginData } from './ModifyHtmlWebpackPlugin';

export default class FaviconWebpackPlugin extends ModifyHtmlWebpackPlugin {
  constructor(
    private pwaOptions: ProjectOptions & { links: any[] },
    private favicon: IconOptions | null
  ) {
    super();
  }

  async modifyAsync(
    compiler: Compiler,
    compilation: compilation.Compilation,
    data: HTMLPluginData
  ): Promise<HTMLPluginData> {
    if (!this.favicon) {
      console.log(chalk.magenta(`\u203A Skipping favicon generation`));
      return data;
    }

    const assets = await generateFaviconAsync(this.pwaOptions, this.favicon);

    const links: any[] = this.pwaOptions.links.filter(
      (v: any) => v.rel && v.rel.split(' ').includes('icon')
    );

    for (const asset of assets) {
      const { attributes = {} } = asset.tag!;
      if (
        links.some((v: any) =>
          v.sizes ? v.sizes === attributes.sizes : v.rel.includes('shortcut')
        )
      ) {
        console.log(
          chalk.magenta(
            `\u203A Using custom favicon icon: <link rel="${attributes.rel}" ${
              attributes.sizes ? `sizes="${attributes.sizes}"` : ''
            } .../>`
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
    return data;
  }
}
