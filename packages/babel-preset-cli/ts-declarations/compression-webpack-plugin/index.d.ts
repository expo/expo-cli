declare module 'compression-webpack-plugin' {
  import { Plugin } from 'webpack';

  interface PluginOptions {
    algorithm: string;
    filename: string;
    minRatio?: number;
    test: RegExp;
    threshold?: number;
  }

  export default class CompressionPlugin extends Plugin {
    constructor(options: PluginOptions);
  }
}
