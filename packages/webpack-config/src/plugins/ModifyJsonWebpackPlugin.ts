import { compilation as compilationNS, Compiler, Plugin } from 'webpack';

import { BeforeEmitOptions } from './JsonWebpackPlugin';

export type Options = {
  path: string;
  json: any;
  pretty?: boolean;
};

function maybeFetchPlugin(compiler: Compiler, name: string): Plugin | undefined {
  return compiler.options?.plugins
    ?.map(({ constructor }) => constructor)
    .find(constructor => constructor && constructor.name.endsWith(name));
}

export default class ModifyJsonWebpackPlugin {
  async modifyAsync(
    compiler: Compiler,
    compilation: compilationNS.Compilation,
    data: BeforeEmitOptions
  ): Promise<BeforeEmitOptions> {
    return data;
  }

  apply(compiler: Compiler) {
    compiler.hooks.make.tapPromise(this.constructor.name, async (compilation: any) => {
      // Hook into the html-webpack-plugin processing and add the html
      const JsonWebpackPlugin = maybeFetchPlugin(compiler, 'PwaManifestWebpackPlugin') as any;
      if (JsonWebpackPlugin) {
        if (typeof JsonWebpackPlugin.getHooks === 'undefined') {
          compilation.errors.push(
            new Error(
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
    });
  }
}
