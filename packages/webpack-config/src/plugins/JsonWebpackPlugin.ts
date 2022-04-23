import { AsyncSeriesWaterfallHook } from 'tapable';
import { Compilation, Compiler, sources } from 'webpack';

export type Options = {
  path: string;
  json: any;
  pretty?: boolean;
};

export type BeforeEmitOptions = Options & { plugin: JsonWebpackPlugin };

export type AfterEmitOptions = Pick<Options, 'json'> & {
  outputName: string;
  plugin: JsonWebpackPlugin;
};

const hooksMap = new WeakMap<Compilation, ReturnType<typeof createWebpackPluginHooks>>();

function createWebpackPluginHooks() {
  return {
    beforeEmit: new AsyncSeriesWaterfallHook<BeforeEmitOptions>(['pluginArgs']),
    afterEmit: new AsyncSeriesWaterfallHook<AfterEmitOptions>(['pluginArgs']),
  };
}

export default class JsonWebpackPlugin {
  static getHooks(compilation: Compilation) {
    let hooks = hooksMap.get(compilation);
    // Setup the hooks only once
    if (hooks === undefined) {
      hooks = createWebpackPluginHooks();
      hooksMap.set(compilation, hooks);
    }
    return hooks;
  }

  constructor(public options: Options) {
    if (!this.options.path || !this.options.json) {
      throw new Error('Failed to write json because either `path` or `json` were not defined.');
    }
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
          await this.writeObject(compilation);
        }
      );
    });
  }

  private writeObject = async (compilation: Compilation): Promise<void> => {
    let result: BeforeEmitOptions = {
      json: this.options.json,
      path: this.options.path,
      plugin: this,
    };
    try {
      result = await JsonWebpackPlugin.getHooks(compilation).beforeEmit.promise(result);
    } catch (error: any) {
      compilation.errors.push(error);
    }

    const json = JSON.stringify(result.json, undefined, this.options.pretty ? 2 : undefined);

    // Once all files are added to the webpack compilation
    // let the webpack compiler continue
    compilation.emitAsset(result.path, new sources.RawSource(json));

    await JsonWebpackPlugin.getHooks(compilation).afterEmit.promise({
      json,
      outputName: result.path,
      plugin: this,
    });
  };
}
