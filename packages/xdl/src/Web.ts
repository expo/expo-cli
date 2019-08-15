import path from 'path';

import chalk from 'chalk';
import fs from 'fs-extra';
import getenv from 'getenv';
import openBrowser from 'react-dev-utils/openBrowser';
import { readConfigJsonAsync } from '@expo/config';
import set from 'lodash/set';
import webpack from 'webpack';
import {
  Configuration as WebpackDevServerConfiguration,
  ProxyConfigMap,
  ProxyConfigArray,
} from 'webpack-dev-server';

import Logger from './Logger';
// @ts-ignore missing types for Doctor until it gets converted to TypeScript
import * as Doctor from './project/Doctor';
import { logWarning, LogTag } from './project/ProjectUtils';
import * as UrlUtils from './UrlUtils';

export interface WebpackConfiguration extends webpack.Configuration {
  devServer?: WebpackDevServerConfiguration;
}

export type WebEnvironment = {
  projectRoot: string;
  pwa: boolean;
  mode: 'development' | 'production' | 'test' | 'none';
  polyfill: boolean;
  development: boolean;
  production: boolean;
  https: boolean;
  info: boolean;
};

type AsyncWebpackConfig =
  | WebpackConfiguration
  | ((env: WebEnvironment, argv: string[]) => Promise<WebpackConfiguration> | WebpackConfiguration);

// When you have errors in the production build that aren't present in the development build you can use `EXPO_WEB_DEBUG=true expo start --no-dev` to debug those errors.
// - Prevent the production build from being minified
// - Include file path info comments in the bundle
export function isDebugModeEnabled(): boolean {
  return getenv.boolish('EXPO_WEB_DEBUG', false);
}

export function isInfoEnabled(): boolean {
  return getenv.boolish('EXPO_WEB_INFO', false);
}

export function shouldWebpackClearLogs(): boolean {
  return !isDebugModeEnabled() && !isInfoEnabled() && !getenv.boolish('EXPO_DEBUG', false);
}

export function logEnvironmentInfo(
  projectRoot: string,
  tag: LogTag,
  config: webpack.Configuration
): void {
  if (isDebugModeEnabled() && config.mode === 'production') {
    logWarning(
      projectRoot,
      tag,
      `Webpack is bundling your project in \`production\` mode with the ${chalk.bold(
        '`EXPO_WEB_DEBUG`'
      )} environment variable enabled. You should toggle it off before building for production.`
    );
  }
}

function applyEnvironmentVariables(config: WebpackConfiguration): WebpackConfiguration {
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

export async function invokeWebpackConfigAsync(
  env: WebEnvironment,
  argv?: string[]
): Promise<WebpackConfiguration> {
  // Check if the project has a webpack.config.js in the root.
  const projectWebpackConfig = path.resolve(env.projectRoot, 'webpack.config.js');
  let config: WebpackConfiguration;
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

export async function openProjectAsync(
  projectRoot: string
): Promise<{ success: true; url: string } | { success: false; error: Error }> {
  await Doctor.validateWebSupportAsync(projectRoot);

  try {
    let url = await UrlUtils.constructWebAppUrlAsync(projectRoot);
    if (!url) {
      throw new Error('Webpack Dev Server is not running');
    }
    openBrowser(url);
    return { success: true, url };
  } catch (e) {
    Logger.global.error(`Couldn't start project on web: ${e.message}`);
    return { success: false, error: e };
  }
}

// If platforms only contains the "web" field
export async function onlySupportsWebAsync(projectRoot: string): Promise<boolean> {
  const { exp } = await readConfigJsonAsync(projectRoot);
  if (Array.isArray(exp.platforms) && exp.platforms.length === 1) {
    return exp.platforms[0] === 'web';
  }
  return false;
}
