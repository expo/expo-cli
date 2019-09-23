import path from 'path';
import webpack from 'webpack';
import merge from 'webpack-merge';

import createDevServerConfigAsync from './createDevServerConfigAsync';
import { Arguments, DevConfiguration, Environment } from './types';
import getConfig from './utils/getConfig';
import common from './webpack.common';

export default async function(env: Environment, argv: Arguments = {}): Promise<DevConfiguration> {
  if (!env.config) {
    // Fill all config values with PWA defaults
    env.config = getConfig(env);
  }

  const devServer = await createDevServerConfigAsync(env, argv);
  return merge(await common(env), {
    output: {
      // Add comments that describe the file import/exports.
      // This will make it easier to debug.
      pathinfo: true,
      // Give the output bundle a constant name to prevent caching.
      // Also there are no actual files generated in dev.
      filename: 'static/js/bundle.js',
      // There are also additional JS chunk files if you use code splitting.
      chunkFilename: 'static/js/[name].chunk.js',
      // Point sourcemap entries to original disk location (format as URL on Windows)
      devtoolModuleFilenameTemplate: (info: webpack.DevtoolModuleFilenameTemplateInfo) =>
        path.resolve(info.absoluteResourcePath).replace(/\\/g, '/'),
    },
    devServer,
  });
}
