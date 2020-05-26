import { getConfig } from '@expo/config';
import * as Webpack from './Webpack';
import * as WebpackEnvironment from './webpack-utils/WebpackEnvironment';
/**
 * @deprecated this is not publicly exposed anymore.
 */
export const isDebugModeEnabled = WebpackEnvironment.isDebugModeEnabled;

/**
 * @deprecated this is not publicly exposed anymore.
 */
export const isInfoEnabled = WebpackEnvironment.isInfoEnabled;

/**
 * @deprecated this is not publicly exposed anymore.
 */
export const shouldWebpackClearLogs = WebpackEnvironment.shouldWebpackClearLogs;

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
