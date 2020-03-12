import chalk from 'chalk';
import { Compiler, compilation } from 'webpack';
import { generateChromeIconAsync } from '@expo/pwa';
import ModifyJsonWebpackPlugin from './ModifyJsonWebpackPlugin';

export type Options = {
  source: string;
  outputPath?: string;
  backgroundColor?: string;
  resizeMode?: 'contain' | 'cover';
};

export default class ChromeIconsWebpackPlugin extends ModifyJsonWebpackPlugin {
  // Maybe we should support the ability to create all icons individually
  constructor(private options: any, private icon: any) {
    // TODO(Bacon): Validation
    super();
  }

  async modifyAsync(
    compiler: Compiler,
    compilation: compilation.Compilation,
    data: any
  ): Promise<any> {
    if (this.icon?.src) {
      if (!Array.isArray(data.json.icons)) data.json.icons = [];
      const iconAssets = await generateChromeIconAsync(this.options, {
        src: this.icon.src,
        backgroundColor: 'transparent',
        resizeMode: 'contain',
      });

      for (const asset of iconAssets) {
        compilation.assets[asset.asset.path] = {
          source: () => asset.asset.source,
          size: () => asset.asset.source.length,
        };

        data.json.icons.push(asset.manifest);
      }
    } else {
      console.log(chalk.magenta(`\u203A Skipping Chrome PWA icon generation`));
    }
    return data;
  }
}
