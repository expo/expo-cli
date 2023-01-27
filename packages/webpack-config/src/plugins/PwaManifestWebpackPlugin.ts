import { joinUrlPath } from 'expo-pwa';
import { Compilation, Compiler, WebpackError, WebpackPluginInstance } from 'webpack';

import JsonWebpackPlugin from './JsonWebpackPlugin';
import { HTMLPluginData } from './ModifyHtmlWebpackPlugin';

export type Icon = {
  src: string;
  sizes: string;
  type: 'image/png';
};

function maybeFetchPlugin(compiler: Compiler, name: string): WebpackPluginInstance | undefined {
  return compiler.options?.plugins
    ?.map(({ constructor }) => constructor)
    .find(constructor => constructor && constructor.name === name);
}

export type PwaManifestOptions = {
  path: string;
  inject?: boolean | Function;
  publicPath: string;
};

export default class PwaManifestWebpackPlugin extends JsonWebpackPlugin {
  rel: string = 'manifest';

  constructor(private pwaOptions: PwaManifestOptions, manifest: any) {
    super({
      path: pwaOptions.path,
      json: manifest,
      pretty: true,
    });
  }

  apply(compiler: Compiler) {
    super.apply(compiler);

    compiler.hooks.compilation.tap(this.constructor.name, (compilation: Compilation) => {
      compilation.hooks.processAssets.tapPromise(
        {
          name: this.constructor.name,
          // https://github.com/webpack/webpack/blob/master/lib/Compilation.js#L3280
          stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        },
        async () => {
          // Hook into the html-webpack-plugin processing and add the html
          const HtmlWebpackPlugin = maybeFetchPlugin(compiler, 'HtmlWebpackPlugin') as any;
          if (HtmlWebpackPlugin) {
            if (typeof HtmlWebpackPlugin.getHooks === 'undefined') {
              compilation.errors.push(
                new WebpackError(
                  'PwaManifestWebpackPlugin - This PwaManifestWebpackPlugin version is not compatible with your current HtmlWebpackPlugin version.\n'
                )
              );
              return;
            }

            HtmlWebpackPlugin.getHooks(compilation).alterAssetTags.tapAsync(
              this.constructor.name,
              (
                data: HTMLPluginData,
                htmlCallback: (error: Error | null, data: HTMLPluginData) => void
              ) => {
                // Skip if a custom injectFunction returns false or if
                // the htmlWebpackPlugin options includes a `favicons: false` flag
                let isInjectionAllowed: boolean;
                if (typeof this.pwaOptions.inject === 'boolean') {
                  isInjectionAllowed = this.pwaOptions.inject;
                } else if (typeof this.pwaOptions.inject === 'function') {
                  isInjectionAllowed = this.pwaOptions.inject(data.plugin);
                } else {
                  isInjectionAllowed = data.plugin.options.pwaManifest !== false;
                }

                if (isInjectionAllowed === false) {
                  return htmlCallback(null, data);
                }

                data.assetTags.meta.push({
                  tagName: 'link',
                  voidTag: true,
                  attributes: {
                    rel: this.rel,
                    href: joinUrlPath(this.pwaOptions.publicPath, this.pwaOptions.path),
                  },
                });

                htmlCallback(null, data);
              }
            );
          }
        }
      );
    });
  }
}
