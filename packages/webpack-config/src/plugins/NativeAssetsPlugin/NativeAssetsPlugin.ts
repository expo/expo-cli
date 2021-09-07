import { Compiler } from 'webpack';

import { NativeAssetResolver, NativeAssetResolverConfig } from './NativeAssetResolver';

/**
 * Convert any asset type to a JS code block that uses React Native's AssetRegistry module.
 */
export class NativeAssetsPlugin {
  constructor(private config: NativeAssetResolverConfig & { persist?: boolean }) {}

  apply(compiler: Compiler) {
    const resolver = new NativeAssetResolver(this.config, compiler);

    if (!compiler.options.module) {
      // @ts-ignore
      compiler.options.module = {
        rules: [],
      };
    }

    compiler.options.module.rules.push({
      test: resolver.config.test,
      use: [
        {
          loader: require.resolve('./loader.cjs'),
          options: {
            platforms: this.config.platforms,
            assetExtensions: this.config.assetExtensions,
            persist: this.config.persist,
          },
        },
      ],
    });

    if (!compiler.options.resolve) {
      compiler.options.resolve = {};
    }

    // @ts-ignore
    compiler.options.resolve.plugins = (compiler.options.resolve.plugins || []).concat(resolver);
  }
}
