/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import chalk from 'chalk';
import clearConsole from 'react-dev-utils/clearConsole';
import formatWebpackMessages from 'react-dev-utils/formatWebpackMessages';
import { Urls } from 'react-dev-utils/WebpackDevServerUtils';
import webpack from 'webpack';

import * as ProjectUtils from './project/ProjectUtils';
import { logEnvironmentInfo, shouldWebpackClearLogs } from './Web';

const CONSOLE_TAG = 'expo';

const SHOULD_CLEAR_CONSOLE = shouldWebpackClearLogs();

function log(projectRoot: string, message: string, showInDevtools = true) {
  if (showInDevtools) {
    ProjectUtils.logInfo(projectRoot, CONSOLE_TAG, message);
  } else {
    console.log(message);
  }
}

function logWarning(projectRoot: string, message: string) {
  ProjectUtils.logWarning(projectRoot, CONSOLE_TAG, message);
}

function logError(projectRoot: string, message: string) {
  ProjectUtils.logError(projectRoot, CONSOLE_TAG, message);
}

function printInstructions(
  projectRoot: string,
  appName: string,
  urls: Urls,
  showInDevtools: boolean
) {
  let message = `You can now view ${chalk.bold(appName)} in the browser.\n\n`;
  if (urls.lanUrlForTerminal) {
    message += `  ${chalk.bold('Local:')}            ${urls.localUrlForTerminal}\n`;
    message += `  ${chalk.bold('On Your Network:')}  ${urls.lanUrlForTerminal}\n`;
  } else {
    message += `  ${urls.localUrlForTerminal}\n`;
  }

  message += `\nNote that the development build is not optimized. To create a production build, use ${chalk.bold(
    `expo build:web`
  )}.`;
  log(projectRoot, message, showInDevtools);
}

export function printPreviewNotice(projectRoot: string, showInDevtools: boolean) {
  log(
    projectRoot,
    chalk.underline.yellow(
      '\nWeb support in Expo is experimental and subject to breaking changes. Do not use this in production yet.'
    ),
    showInDevtools
  );
}

export default function createWebpackCompiler({
  projectRoot,
  appName,
  config,
  urls,
  nonInteractive,
  useYarn,
  webpackFactory,
  onFinished,
}: {
  projectRoot: string;
  appName: string;
  config: webpack.Configuration;
  urls: Urls;
  nonInteractive?: boolean;
  useYarn: boolean;
  webpackFactory: (options?: webpack.Configuration) => webpack.Compiler;
  onFinished: (() => void);
}) {
  // "Compiler" is a low-level interface to Webpack.
  // It lets us listen to some events and provide our own custom messages.
  const compiler = webpackFactory(config);

  // "invalid" event fires when you have changed a file, and Webpack is
  // recompiling a bundle. WebpackDevServer takes care to pause serving the
  // bundle, so if you refresh, it'll wait instead of serving the old one.
  // "invalid" is short for "bundle invalidated", it doesn't imply any errors.
  compiler.hooks.invalid.tap('invalid', () => {
    if (SHOULD_CLEAR_CONSOLE && !nonInteractive) {
      clearConsole();
    }
    log(projectRoot, '\nCompiling...');
  });

  let isFirstCompile = true;

  // "done" event fires when Webpack has finished recompiling the bundle.
  // Whether or not you have warnings or errors, you will get this event.
  compiler.hooks.done.tap('done', async stats => {
    if (SHOULD_CLEAR_CONSOLE && !nonInteractive) {
      clearConsole();
    }

    // We have switched off the default Webpack output in WebpackDevServer
    // options so we are going to "massage" the warnings and errors and present
    // them in a readable focused way.
    // We only construct the warnings and errors for speed:
    // https://github.com/facebook/create-react-app/issues/4492#issuecomment-421959548
    const statsData = stats.toJson({
      all: false,
      warnings: true,
      errors: true,
    });

    const messages = formatWebpackMessages(statsData);

    const isSuccessful = !messages.errors.length && !messages.warnings.length;
    if (isSuccessful) {
      printSuccessMessages({ projectRoot, appName, urls, config, isFirstCompile, nonInteractive });
    }

    if (!isFirstCompile) {
      log(
        projectRoot,
        `Press ${chalk.bold('?')} to show a list of all available commands.\n`,
        false
      );
    }

    onFinished();
    isFirstCompile = false;

    // If errors exist, only show errors.
    if (messages.errors.length) {
      // Only keep the first error. Others are often indicative
      // of the same problem, but confuse the reader with noise.
      if (messages.errors.length > 1) {
        messages.errors.length = 1;
      }
      logError(projectRoot, chalk.red('Failed to compile.\n') + messages.errors.join('\n\n'));
      return;
    }

    // Show warnings if no errors were found.
    if (messages.warnings.length) {
      logWarning(
        projectRoot,
        chalk.yellow('Compiled with warnings.\n') + messages.warnings.join('\n\n')
      );
    }
  });

  return compiler;
}

export function printSuccessMessages({
  projectRoot,
  appName,
  urls,
  config,
  isFirstCompile,
  nonInteractive,
}: {
  projectRoot: string;
  appName: string;
  config: webpack.Configuration;
  urls: Urls;
  isFirstCompile: boolean;
  nonInteractive?: boolean;
}) {
  log(projectRoot, chalk.bold.cyan(`Compiled successfully!`));
  printPreviewNotice(projectRoot, isFirstCompile);
  logEnvironmentInfo(projectRoot, CONSOLE_TAG, config);

  if (!nonInteractive || isFirstCompile) {
    printInstructions(projectRoot, appName, urls, isFirstCompile);
  }
}
