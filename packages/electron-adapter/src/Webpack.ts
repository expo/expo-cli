import { withAlias } from '@expo/webpack-config/webpack/extensions';
import { createBabelLoaderFromEnvironment } from '@expo/webpack-config/webpack/loaders/createBabelLoader';
import { ExpoDefinePlugin, ExpoInterpolateHtmlPlugin } from '@expo/webpack-config/webpack/plugins';
import { getModuleFileExtensions } from '@expo/webpack-config/webpack/utils';
import getConfig from '@expo/webpack-config/webpack/utils/getConfig';
import {
  getPluginsByName,
  getRulesByMatchingFiles,
} from '@expo/webpack-config/webpack/utils/loaders';
import { getPaths } from '@expo/webpack-config/webpack/utils/paths';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import * as path from 'path';
import { Configuration } from 'webpack';

export function withExpoWebpack(config: Configuration, options: { projectRoot?: string } = {}) {
  // Support React Native aliases
  config = withAlias(config);

  const projectRoot = options.projectRoot || process.cwd();

  const env: any = {
    platform: 'electron',
    projectRoot,
    mode: config.mode === 'production' ? config.mode : 'development',
    locations: getPaths(projectRoot),
  };
  if (!config.plugins) config.plugins = [];
  if (!config.resolve) config.resolve = {};

  env.config = getConfig(env);

  const [plugin] = getPluginsByName(config, 'HtmlWebpackPlugin');
  if (plugin) {
    const { options } = plugin.plugin as any;
    // Replace HTML Webpack Plugin so we can interpolate it
    config.plugins.splice(plugin.index, 1, new HtmlWebpackPlugin(options));
    config.plugins.splice(
      plugin.index + 1,
      0,
      // Add variables to the `index.html`
      ExpoInterpolateHtmlPlugin.fromEnv(env, HtmlWebpackPlugin)
    );
  }

  // Add support for expo-constants
  config.plugins.push(ExpoDefinePlugin.fromEnv(env));

  // Support platform extensions
  config.resolve.extensions = getModuleFileExtensions('electron', 'web');
  config.resolve.extensions.push('.node');

  // Replace JS babel loaders with Expo loaders that can handle RN libraries
  const rules = getRulesByMatchingFiles(config, [path.resolve(env.projectRoot, 'foo.js')]);
  for (const filename of Object.keys(rules)) {
    for (const loaderItem of rules[filename]) {
      const babelConfig = createBabelLoaderFromEnvironment(env);
      (config.module || { rules: [] }).rules.splice(loaderItem.index, 1, babelConfig);
      return config;
    }
  }

  return config;
}
