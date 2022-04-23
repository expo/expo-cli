import { compilation as compilationNS, Compiler, Plugin } from 'webpack';

function maybeFetchPlugin(compiler: Compiler, name: string): Plugin | undefined {
  return compiler.options?.plugins
    ?.map(({ constructor }) => constructor)
    .find(constructor => constructor && constructor.name === name);
}

export type HTMLPluginData = {
  assetTags: any;
  outputName: string;
  plugin: any;
};

export type HTMLLinkNode = {
  rel?: string;
  name?: string;
  content?: string;
  media?: string;
  href?: string;
  sizes?: string;
  node: any;
};

export default class ModifyHtmlWebpackPlugin {
  constructor(private modifyOptions: { inject?: boolean | Function } = {}) {}

  async modifyAsync(
    compiler: Compiler,
    compilation: compilationNS.Compilation,
    data: HTMLPluginData
  ): Promise<HTMLPluginData> {
    return data;
  }

  apply(compiler: Compiler) {
    compiler.hooks.make.tapPromise(
      this.constructor.name,
      async (compilation: compilationNS.Compilation) => {
        // Hook into the html-webpack-plugin processing and add the html
        const HtmlWebpackPlugin = maybeFetchPlugin(compiler, 'HtmlWebpackPlugin') as any;
        if (HtmlWebpackPlugin) {
          if (typeof HtmlWebpackPlugin.getHooks === 'undefined') {
            compilation.errors.push(
              new Error(
                'ModifyHtmlWebpackPlugin - This ModifyHtmlWebpackPlugin version is not compatible with your current HtmlWebpackPlugin version.\n'
              )
            );
            return;
          }

          HtmlWebpackPlugin.getHooks(compilation).alterAssetTags.tapAsync(
            this.constructor.name,
            async (
              data: HTMLPluginData,
              htmlCallback: (error: Error | null, data: HTMLPluginData) => void
            ) => {
              // Skip if a custom injectFunction returns false or if
              // the htmlWebpackPlugin optuons includes a `favicons: false` flag
              const isInjectionAllowed =
                typeof this.modifyOptions.inject === 'function'
                  ? this.modifyOptions.inject(data.plugin)
                  : data.plugin.options.pwaManifest !== false;

              if (isInjectionAllowed === false) {
                return htmlCallback(null, data);
              }

              try {
                data = await this.modifyAsync(compiler, compilation, data);
              } catch (error: any) {
                compilation.errors.push(error);
              }

              htmlCallback(null, data);
            }
          );
        }
      }
    );
  }
}
