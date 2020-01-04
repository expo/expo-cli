import { AnyConfiguration } from '@expo/webpack-config/webpack/types';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';

import { CLIWebOptions, WebEnvironment } from './Webpack.types';
import { isDebugModeEnabled } from './WebpackEnv';

export function setMode(mode: 'development' | 'production' | 'test' | 'none'): void {
  process.env.BABEL_ENV = mode;
  process.env.NODE_ENV = mode;
}

export async function invokeWebpackConfigAsync(
  env: WebEnvironment,
  argv?: string[]
): Promise<AnyConfiguration> {
  // Check if the project has a webpack.config.js in the root.
  const projectWebpackConfig = path.resolve(env.projectRoot, 'webpack.config.js');
  let config: AnyConfiguration;
  if (fs.existsSync(projectWebpackConfig)) {
    const webpackConfig = require(projectWebpackConfig);
    if (typeof webpackConfig === 'function') {
      config = await webpackConfig(env, argv);
    } else {
      config = webpackConfig;
    }
  } else {
    // Fallback to the default expo webpack config.
    const createExpoWebpackConfigAsync = require('@expo/webpack-config');
    config = await createExpoWebpackConfigAsync(env, argv);
  }
  return applyEnvironmentVariables(config);
}

export async function createWebpackConfigAsync(
  env: WebEnvironment,
  options: CLIWebOptions = {}
): Promise<AnyConfiguration> {
  setMode(env.mode);

  let config;
  if (options.unimodulesOnly) {
    const { withUnimodules } = require('@expo/webpack-config/addons');
    config = withUnimodules({}, env);
  } else {
    config = await invokeWebpackConfigAsync(env);
  }

  return config;
}

function applyEnvironmentVariables(config: AnyConfiguration): AnyConfiguration {
  // Use EXPO_DEBUG_WEB=true to enable debugging features for cases where the prod build
  // has errors that aren't caught in development mode.
  // Related: https://github.com/expo/expo-cli/issues/614
  if (isDebugModeEnabled() && config.mode === 'production') {
    console.log(chalk.bgYellow.black('Bundling the project in debug mode.'));

    const output = config.output || {};
    const optimization = config.optimization || {};

    // Enable line to line mapped mode for all/specified modules.
    // Line to line mapped mode uses a simple SourceMap where each line of the generated source is mapped to the same line of the original source.
    // It’s a performance optimization. Only use it if your performance need to be better and you are sure that input lines match which generated lines.
    // true enables it for all modules (not recommended)
    output.devtoolLineToLine = true;

    // Add comments that describe the file import/exports.
    // This will make it easier to debug.
    output.pathinfo = true;
    // Instead of numeric ids, give modules readable names for better debugging.
    optimization.namedModules = true;
    // Instead of numeric ids, give chunks readable names for better debugging.
    optimization.namedChunks = true;
    // Readable ids for better debugging.
    // @ts-ignore Property 'moduleIds' does not exist.
    optimization.moduleIds = 'named';
    // if optimization.namedChunks is enabled optimization.chunkIds is set to 'named'.
    // This will manually enable it just to be safe.
    // @ts-ignore Property 'chunkIds' does not exist.
    optimization.chunkIds = 'named';

    if (optimization.splitChunks) {
      optimization.splitChunks.name = true;
    }

    Object.assign(config, { output, optimization });
  }

  return config;
}
