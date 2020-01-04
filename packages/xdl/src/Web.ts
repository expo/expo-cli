import { AnyConfiguration } from '@expo/webpack-config/webpack/types';
import getenv from 'getenv';
import webpack from 'webpack';
import { Configuration as WebpackDevServerConfiguration } from 'webpack-dev-server';

import { LogTag } from './project/ProjectUtils';
import * as Webpack from './Webpack';
import * as WebpackConfig from './Webpack/WebpackConfig';

/**
 * @deprecated
 */
export interface WebpackConfiguration extends webpack.Configuration {
  devServer?: WebpackDevServerConfiguration;
}

/**
 * @deprecated
 */
export type WebEnvironment = {
  projectRoot: string;
  isImageEditingEnabled: boolean;
  // deprecated
  pwa: boolean;
  mode: 'development' | 'production' | 'test' | 'none';
  https: boolean;
  info: boolean;
};

/**
 * @deprecated
 */
export function isDebugModeEnabled(): boolean {
  return getenv.boolish('EXPO_WEB_DEBUG', false);
}

/**
 * @deprecated
 */
export function isInfoEnabled(): boolean {
  return getenv.boolish('EXPO_WEB_INFO', false);
}

/**
 * @deprecated
 */
export function shouldWebpackClearLogs(): boolean {
  return !isDebugModeEnabled() && !isInfoEnabled() && !getenv.boolish('EXPO_DEBUG', false);
}

/**
 * @deprecated Use Webpack.logEnvironmentInfo(projectRoot, tag, config)
 */
export function logEnvironmentInfo(
  projectRoot: string,
  tag: LogTag,
  config: webpack.Configuration
): void {
  Webpack.logEnvironmentInfo(projectRoot, tag, config);
}

/**
 * @deprecated
 */
export async function invokeWebpackConfigAsync(
  env: WebEnvironment,
  argv?: string[]
): Promise<AnyConfiguration> {
  return WebpackConfig.invokeWebpackConfigAsync(env, argv);
}

/**
 * @deprecated use Webpack.openAsync(projectRoot)
 */
export async function openProjectAsync(
  projectRoot: string
): Promise<{ success: true; url: string } | { success: false; error: Error }> {
  if (Webpack.openProject(projectRoot)) {
    return { success: true, url: Webpack.getUrl(projectRoot)! };
  }
  return { success: false, error: new Error('Webpack Dev Server is not running') };
}

/**
 * @deprecated use Webpack.isWebOnly(projectRoot)
 */
export async function onlySupportsWebAsync(projectRoot: string): Promise<boolean> {
  return Webpack.isWebOnly(projectRoot);
}
