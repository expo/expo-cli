declare module 'brotli-webpack-plugin' {
  import webpack from 'webpack';

  interface IBrotliWebpackOptions {
    minRatio: number;
  }

  class BrotliWebpackPlugin extends webpack.Plugin {
    public constructor(opt: IBrotliWebpackOptions);
  }

  export = BrotliWebpackPlugin;
}

declare module 'styled-theme';
