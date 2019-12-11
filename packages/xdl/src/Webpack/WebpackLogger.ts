import chalk from 'chalk';
import webpack from 'webpack';

import { LogTag, getPlatformTag, logWarning } from '../project/ProjectUtils';
import { isDebugModeEnabled } from './WebpackEnv';

export const WEBPACK_LOG_TAG = 'expo';

export const PLATFORM_TAG = getPlatformTag('web');

export const withTag = (...messages: any[]) => [PLATFORM_TAG + ' ', ...messages].join('');

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
