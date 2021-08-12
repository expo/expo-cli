import { AsyncSeriesWaterfallHook } from 'tapable';
import { Compilation, Compiler } from 'webpack';

export type Options = {
  path: string;
  json: any;
  pretty?: boolean;
};

export type BeforeEmitOptions = Options & { plugin: JsonWebpackPlugin };

const hooksMap = new WeakMap<Compilation, Record<string, AsyncSeriesWaterfallHook>>();

function createWebpackPluginHooks(): Record<string, AsyncSeriesWaterfallHook> {
  return {
    beforeEmit: new AsyncSeriesWaterfallHook(['pluginArgs']),
    afterEmit: new AsyncSeriesWaterfallHook(['pluginArgs']),
  };
}

export default class JsonWebpackPlugin {
  static getHooks(compilation: Compilation): Record<string, AsyncSeriesWaterfallHook> {
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
    compiler.hooks.emit.tapAsync(this.constructor.name, this.writeObject);
  }

  private writeObject = async (compilation: Compilation, callback: () => void): Promise<void> => {
    let result: BeforeEmitOptions = {
      json: this.options.json,
      path: this.options.path,
      plugin: this,
    };
    try {
      result = await JsonWebpackPlugin.getHooks(compilation).beforeEmit.promise(result);
    } catch (error) {
      compilation.errors.push(error);
    }

    const json = JSON.stringify(result.json, undefined, this.options.pretty ? 2 : undefined);

    // Once all files are added to the webpack compilation
    // let the webpack compiler continue
    compilation.assets[result.path] = {
      source: () => json,
      size: () => json.length,
    };

    await JsonWebpackPlugin.getHooks(compilation).afterEmit.promise({
      json,
      outputName: result.path,
      plugin: this,
    });

    callback();
  };
}
