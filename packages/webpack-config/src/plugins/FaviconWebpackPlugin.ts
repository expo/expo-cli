import { Compiler, compilation } from 'webpack';

import ModifyHtmlWebpackPlugin from './ModifyHtmlWebpackPlugin';

import { generateFaviconAsync } from '../../../pwa/build/Webpack';

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

    // TODO: Prevent duplicate favicon tag
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
