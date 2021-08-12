import chalk from 'chalk';
import getenv from 'getenv';
import { Configuration } from 'webpack';

import { ProjectUtils } from '../internal';

export const HOST = getenv.string('WEB_HOST', '0.0.0.0');

export const DEFAULT_PORT = getenv.int('WEB_PORT', 19006);

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
  tag: ProjectUtils.LogTag,
  config: Pick<Configuration, 'mode'>
): void {
  if (isDebugModeEnabled() && config.mode === 'production') {
    ProjectUtils.logWarning(
      projectRoot,
      tag,
      `Webpack is bundling your project in \`production\` mode with the ${chalk.bold(
        '`EXPO_WEB_DEBUG`'
      )} environment variable enabled. You should toggle it off before building for production.`
    );
  }
}
