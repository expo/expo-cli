import { getModuleFileExtensions } from '@expo/webpack-config/webpack/utils';
import { getPluginsByName } from '@expo/webpack-config/webpack/utils/loaders';
import { boolish } from 'getenv';
import * as path from 'path';
import resolveFrom from 'resolve-from';
import { Configuration } from 'webpack';

export type Environment = { projectRoot: string; [key: string]: any };

export type Arguments = { [key: string]: any };

export type WebpackConfigFactory = (
  env: Environment,
  argv: Arguments
) => Configuration | Promise<Configuration>;

function ensureExpoWebpackConfigInstalled(projectRoot: string) {
  const projectHasWebpackConfig = !!resolveFrom.silent(projectRoot, '@expo/webpack-config');
  if (!projectHasWebpackConfig) {
    throw new Error(
      `\`@expo/electron-adapter\` requires the package \`@expo/webpack-config\` to be installed in your project. To continue, run the following then try again: \`yarn add --dev @expo/webpack-config\``
    );
  }
}

export async function withElectronAsync(
  env: Environment,
  argv: Arguments,
  createWebpackConfigAsync?: WebpackConfigFactory
): Promise<Configuration> {
  if (typeof createWebpackConfigAsync !== 'function') {
    // No custom config factory was passed, attempt to invoke method again with @expo/webpack-config.
    ensureExpoWebpackConfigInstalled(env.projectRoot);
    const createExpoWebpackConfigAsync = require('@expo/webpack-config');
    return await withElectronAsync(env, argv, createExpoWebpackConfigAsync);
  }

  const shouldStartElectron = boolish('EXPO_ELECTRON_ENABLED', false);

  if (shouldStartElectron) {
    configureEnvironment(env.projectRoot);
  }

  const config = await createWebpackConfigAsync(env, argv);

  if (!config) {
    throw new Error(
      `The config returned from \`createWebpackConfigAsync(env, argv)\` was null. Expected a valid \`Webpack.Configuration\``
    );
  }

  return shouldStartElectron ? injectElectronAdapterSupport(config) : config;
}

export function configureEnvironment(projectRoot: string, outputFolder: string = 'electron-build') {
  process.env.WEBPACK_BUILD_OUTPUT_PATH = path.join(projectRoot, outputFolder, 'web');
  process.env.WEB_PUBLIC_URL = './';
}

/**
 * Configure @expo/webpack-config to work with Electron
 */
export function injectElectronAdapterSupport(config: Configuration): Configuration {
  config.target = 'electron-renderer';

  const isProduction = config.mode === 'production';

  if (isProduction) {
    config.devtool = 'nosources-source-map';
  }

  // It's important that we overwrite the existing node mocks
  config.node = {
    __filename: !isProduction,
    __dirname: !isProduction,
  };

  if (!config.output) config.output = {};

  // Remove compression plugins
  for (const pluginName of ['CompressionPlugin', 'BrotliPlugin']) {
    const [plugin] = getPluginsByName(config, pluginName);
    if (plugin) {
      config.plugins!.splice(plugin.index, 1);
    }
  }

  config.output = {
    ...config.output,
    filename: '[name].js',
    chunkFilename: '[name].bundle.js',
    libraryTarget: 'commonjs2',
  };

  if (!config.resolve) {
    config.resolve = {};
  }

  // Make electron projects resolve files with a .electron extension first
  config.resolve.extensions = getModuleFileExtensions('electron', 'web');

  return config;
}
