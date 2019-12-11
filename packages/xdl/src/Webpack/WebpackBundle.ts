import { AnyConfiguration } from '@expo/webpack-config/webpack/types';
import chalk from 'chalk';
import formatWebpackMessages from 'react-dev-utils/formatWebpackMessages';
import webpack from 'webpack';

import { logError, logInfo, logWarning } from '../project/ProjectUtils';
import { BundlingOptions, CLIWebOptions } from './Webpack.types';
import { createWebpackConfigAsync } from './WebpackConfig';
import { WEBPACK_LOG_TAG, withTag } from './WebpackLogger';
import { getWebpackConfigEnvFromBundlingOptionsAsync } from './WebpackOptions';

export async function bundleAsync(projectRoot: string, options?: BundlingOptions): Promise<void> {
  const fullOptions = transformCLIOptions({
    ...options,
  });

  const env = await getWebpackConfigEnvFromBundlingOptionsAsync(projectRoot, {
    ...fullOptions,
    // Force production
    mode: 'production',
  });

  const config = await createWebpackConfigAsync(env, fullOptions);

  await bundleWithConfigAsync(projectRoot, config);
}

export async function bundleWithConfigAsync(projectRoot: string, config: AnyConfiguration) {
  const compiler = webpack(config);

  try {
    const { warnings } = await compileWebAppAsync(projectRoot, compiler);
    if (warnings.length) {
      logWarning(projectRoot, WEBPACK_LOG_TAG, withTag(chalk.yellow('Compiled with warnings.\n')));
      logWarning(projectRoot, WEBPACK_LOG_TAG, warnings.join('\n\n'));
    } else {
      logInfo(projectRoot, WEBPACK_LOG_TAG, withTag(chalk.green('Compiled successfully.\n')));
    }
  } catch (error) {
    logError(projectRoot, WEBPACK_LOG_TAG, withTag(chalk.red('Failed to compile.\n')));
    throw error;
  }
}

export async function compileWebAppAsync(
  projectRoot: string,
  compiler: webpack.Compiler
): Promise<any> {
  // We generate the stats.json file in the webpack-config
  const { warnings } = await new Promise((resolve, reject) =>
    compiler.run((error, stats) => {
      let messages;
      if (error) {
        if (!error.message) {
          return reject(error);
        }
        messages = formatWebpackMessages({
          errors: [error.message],
          warnings: [],
          _showErrors: true,
          _showWarnings: true,
        });
      } else {
        messages = formatWebpackMessages(
          stats.toJson({ all: false, warnings: true, errors: true })
        );
      }

      if (messages.errors.length) {
        // Only keep the first error. Others are often indicative
        // of the same problem, but confuse the reader with noise.
        if (messages.errors.length > 1) {
          messages.errors.length = 1;
        }
        return reject(new Error(messages.errors.join('\n\n')));
      }
      if (
        process.env.CI &&
        (typeof process.env.CI !== 'string' || process.env.CI.toLowerCase() !== 'false') &&
        messages.warnings.length
      ) {
        logWarning(
          projectRoot,
          WEBPACK_LOG_TAG,
          withTag(
            chalk.yellow(
              '\nTreating warnings as errors because process.env.CI = true.\n' +
                'Most CI servers set it automatically.\n'
            )
          )
        );
        return reject(new Error(messages.warnings.join('\n\n')));
      }
      resolve({
        warnings: messages.warnings,
      });
    })
  );
  return { warnings };
}

/// Transform values

function transformCLIOptions(options: CLIWebOptions): BundlingOptions {
  // Transform the CLI flags into more explicit values
  return {
    ...options,
    isImageEditingEnabled: options.pwa,
  };
}
