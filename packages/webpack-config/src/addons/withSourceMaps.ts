import { Configuration, SourceMapDevToolPlugin } from 'webpack';

import { InputEnvironment } from '../types';

function isNative(env: Pick<InputEnvironment, 'platform'>): boolean {
  return !!env.platform && ['ios', 'android'].includes(env.platform);
}

function createSourceMapPlugin(
  webpackConfig: Configuration,
  env: Pick<InputEnvironment, 'mode'> = {}
) {
  const mode = env.mode ?? webpackConfig.mode;
  const isDev = mode !== 'production';

  return (
    // This is a hack that we use in place of devtool because the index.bundle is not index.js on native.
    // The default devtool won't test for .bundle and there's no way to set it there.
    // This doesn't support inline source maps.
    new SourceMapDevToolPlugin({
      test: /\.(js|tsx?|(js)?bundle)($|\?)/i,
      filename: webpackConfig.output?.sourceMapFilename,
      // @ts-ignore: this is how webpack works internally
      moduleFilenameTemplate: webpackConfig.output?.devtoolModuleFilenameTemplate,
      // Emulate the `devtool` settings based on CRA defaults
      ...(isDev
        ? {
            // cheap-module-source-map
            module: true,
            columns: false,
          }
        : {
            // source-map
          }),
    })
  );
}

/**
 * Because webpack doesn't support `.bundle` extensions (why should they).
 * We need to extract the default settings for source maps and create a native source map plugin.
 * This does nothing if the env.platform is not ios or android.
 *
 * @param webpackConfig
 * @param env
 */
export default function withPlatformSourceMaps(
  webpackConfig: Configuration,
  env: Pick<InputEnvironment, 'platform' | 'mode'> = {}
): Configuration {
  if (!isNative(env)) {
    return webpackConfig;
  }

  if (!webpackConfig.plugins) webpackConfig.plugins = [];

  webpackConfig.plugins.push(createSourceMapPlugin(webpackConfig, env));
  webpackConfig.devtool = false;

  return webpackConfig;
}
