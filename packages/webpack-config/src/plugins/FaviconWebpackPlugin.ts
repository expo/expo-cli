import { Compiler, compilation } from 'webpack';

import { generateFaviconAsync } from '@expo/pwa';
import chalk from 'chalk';
import ModifyHtmlWebpackPlugin from './ModifyHtmlWebpackPlugin';

export default class FaviconWebpackPlugin extends ModifyHtmlWebpackPlugin {
  constructor(private pwaOptions: any, private favicon: any) {
    super();
  }

  async modifyAsync(
    compiler: Compiler,
    compilation: compilation.Compilation,
    data: any
  ): Promise<any> {
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
