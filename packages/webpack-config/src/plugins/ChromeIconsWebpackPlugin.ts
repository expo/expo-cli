import chalk from 'chalk';
import { Compiler, compilation } from 'webpack';
import { IconOptions, ProjectOptions, generateChromeIconAsync } from '@expo/pwa';
import ModifyJsonWebpackPlugin from './ModifyJsonWebpackPlugin';
import { BeforeEmitOptions } from './JsonWebpackPlugin';

export type Options = {
  source: string;
  outputPath?: string;
  backgroundColor?: string;
  resizeMode?: 'contain' | 'cover';
};

export default class ChromeIconsWebpackPlugin extends ModifyJsonWebpackPlugin {
  // Maybe we should support the ability to create all icons individually
  constructor(private options: ProjectOptions, private icon: IconOptions | null) {
    // TODO(Bacon): Validation
    super();
  }

  async modifyAsync(
    compiler: Compiler,
    compilation: compilation.Compilation,
    data: BeforeEmitOptions
  ): Promise<BeforeEmitOptions> {
    // If the icons array is already defined, then skip icon generation.
    if (Array.isArray(data.json.icons)) {
      console.log(
        chalk.magenta(`\u203A Chrome PWA icons: Using custom \`icons\` from PWA manifest`)
      );
      return data;
    }
    if (!this.icon) {
      console.log(chalk.yellow(`\u203A Chrome PWA icons: No icon found, skipping auto generation`));
      return data;
    }

    data.json.icons = [];

    const iconAssets = await generateChromeIconAsync(this.options, this.icon);

    for (const asset of iconAssets) {
      compilation.assets[asset.asset.path] = {
        source: () => asset.asset.source,
        size: () => asset.asset.source.length,
      };

      data.json.icons.push(asset.manifest);
    }

    return data;
  }
}
