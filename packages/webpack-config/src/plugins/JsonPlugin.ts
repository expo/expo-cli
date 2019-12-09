class JsonPlugin {
  constructor(private options: any = {}) {
    if (!this.options.path) {
      throw new Error('Failed to write json in webpack.');
    }
    this.options.path = options.path || 'data.json';
    this.options.pretty = options.pretty;
  }

  apply(compiler: any) {
    if (!this.options.object) {
      return;
    }
    if (compiler.hooks) {
      compiler.hooks.emit.tapAsync(this.constructor.name, this.writeContents);
    } else {
      compiler.plugin('emit', this.writeContents);
    }
  }

  private writeContents = (compilation: any, callback: any) => {
    const json = JSON.stringify(
      this.options.object,
      undefined,
      this.options.pretty ? 2 : undefined
    );

    Object.assign(compilation.assets, {
      [this.options.path]: {
        source() {
          return json;
        },
        size() {
          return json.length;
        },
      },
    });

    callback();
  };
}

export default JsonPlugin;
