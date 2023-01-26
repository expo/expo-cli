import { Compilation, Compiler, WebpackError, WebpackPluginInstance } from 'webpack';

import { BeforeEmitOptions } from './JsonWebpackPlugin';

export type Options = {
  path: string;
  json: any;
  pretty?: boolean;
};

function maybeFetchPlugin(compiler: Compiler, name: string): WebpackPluginInstance | undefined {
  return compiler.options?.plugins
    ?.map(({ constructor }) => constructor)
    .find(constructor => constructor && constructor.name.endsWith(name));
}

export default class ModifyJsonWebpackPlugin {
  async modifyAsync(
    compiler: Compiler,
    compilation: Compilation,
    data: BeforeEmitOptions
  ): Promise<BeforeEmitOptions> {
    return data;
  }

  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap(this.constructor.name, (compilation: Compilation) => {
      compilation.hooks.processAssets.tapPromise(
        {
          name: this.constructor.name,
          // https://github.com/webpack/webpack/blob/master/lib/Compilation.js#L3280
          stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        },
        async () => {
          // Hook into the html-webpack-plugin processing and add the html
          const JsonWebpackPlugin = maybeFetchPlugin(compiler, 'PwaManifestWebpackPlugin') as any;
          if (JsonWebpackPlugin) {
            if (typeof JsonWebpackPlugin.getHooks === 'undefined') {
              compilation.errors.push(
                new WebpackError(
                  'ModifyJsonWebpackPlugin - This ModifyJsonWebpackPlugin version is not compatible with your current JsonWebpackPlugin version.\n'
                )
              );
              return;
            }

            JsonWebpackPlugin.getHooks(compilation).beforeEmit.tapAsync(
              this.constructor.name,
              async (
                data: BeforeEmitOptions,
                callback: (error: Error | null, data: BeforeEmitOptions) => void
              ) => {
                try {
                  data = await this.modifyAsync(compiler, compilation, data);
                } catch (error: any) {
                  compilation.errors.push(error);
                }

                callback(null, data);
              }
            );
          }
        }
      );
    });
  }
}
