import { getConfig } from '@expo/config';
import * as Webpack from './Webpack';
/**
 * @deprecated use Webpack.isDebugModeEnabled() instead
 */
export const isDebugModeEnabled = Webpack.isDebugModeEnabled;

/**
 * @deprecated use Webpack.isInfoEnabled() instead
 */
export const isInfoEnabled = Webpack.isInfoEnabled;

/**
 * @deprecated use Webpack.shouldWebpackClearLogs() instead
 */
export const shouldWebpackClearLogs = Webpack.shouldWebpackClearLogs;

/**
 * @deprecated use Webpack.logEnvironmentInfo() instead
 */
export const logEnvironmentInfo = Webpack.logEnvironmentInfo;

/**
 * @deprecated use Webpack.invokeWebpackConfigAsync() instead
 */
export const invokeWebpackConfigAsync = Webpack.invokeWebpackConfigAsync;

/**
 * @deprecated use Webpack.openProjectAsync() instead
 */
export const openProjectAsync = Webpack.openProjectAsync;

/**
 * @deprecated use Webpack.onlySupportsWebAsync() instead
 */
export const onlySupportsWebAsync = (projectRoot: string): boolean => {
  const { exp } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
  });
  if (Array.isArray(exp.platforms) && exp.platforms.length === 1) {
    return exp.platforms[0] === 'web';
  }
  return false;
};
