/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import boxen from 'boxen';
import chalk from 'chalk';
import { Urls } from 'react-dev-utils/WebpackDevServerUtils';
import formatWebpackMessages from 'react-dev-utils/formatWebpackMessages';
import webpack from 'webpack';

import { ProjectUtils, WebpackEnvironment } from '../internal';

const CONSOLE_TAG = 'expo';

const SHOULD_CLEAR_CONSOLE = WebpackEnvironment.shouldWebpackClearLogs();

function log(projectRoot: string, message: string, showInDevtools = true) {
  if (showInDevtools) {
    ProjectUtils.logInfo(projectRoot, CONSOLE_TAG, message);
  } else {
    console.log(message);
  }
}

function clearLogs() {
  process.stdout.write(process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H');
}

function logWarning(projectRoot: string, message: string) {
  ProjectUtils.logWarning(projectRoot, CONSOLE_TAG, message);
}

function logError(projectRoot: string, message: string) {
  ProjectUtils.logError(projectRoot, CONSOLE_TAG, message);
}

export function printInstructions(
  projectRoot: string,
  {
    appName,
    urls,
    shouldPrintHelp,
    showInDevtools,
  }: {
    appName: string;
    urls: Urls;
    shouldPrintHelp?: boolean;
    showInDevtools: boolean;
  }
) {
  printPreviewNotice(projectRoot, showInDevtools);

  let message = '\n';
  message += `You can now view ${chalk.bold(appName)} in the browser\n`;

  const divider = chalk.dim`│`;

  if (urls.lanUrlForTerminal) {
    message += `\n\u203A ${chalk.reset('Local')}   ${divider} ${urls.localUrlForTerminal}`;
    message += `\n\u203A ${chalk.reset('LAN')}     ${divider} ${urls.lanUrlForTerminal}`;
  } else {
    message += `\n\u203A ${urls.localUrlForTerminal}`;
  }

  message += '\n';

  message += `\n\u203A Run ${chalk.bold(`expo build:web`)} to optimize and build for production`;

  message += '\n';

  message += `\n\u203A Press ${chalk.bold(`w`)} ${divider} open in the browser`;
  if (shouldPrintHelp) {
    message += `\n\u203A Press ${chalk.bold(`?`)} ${divider} show all commands`;
  }

  log(projectRoot, message, showInDevtools);
}

export function printPreviewNotice(projectRoot: string, showInDevtools: boolean) {
  log(
    projectRoot,
    boxen(
      chalk.magenta.dim(
        'Expo web is in late beta, please report any bugs or missing features on the Expo repo.\n' +
          'You can follow the V1 release for more info: https://github.com/expo/expo/issues/6782'
      ),
      { dimBorder: true, borderColor: 'magenta', padding: { top: 0, left: 1, bottom: 0, right: 1 } }
    ),
    showInDevtools
  );
}

export function createWebpackCompiler({
  projectRoot,
  appName,
  config,
  urls,
  nonInteractive,
  webpackFactory,
  onFinished,
}: {
  projectRoot: string;
  appName: string;
  config: webpack.Configuration;
  urls: Urls;
  nonInteractive?: boolean;
  webpackFactory: (options?: webpack.Configuration) => webpack.Compiler;
  onFinished: () => void;
}) {
  // "Compiler" is a low-level interface to Webpack.
  // It lets us listen to some events and provide our own custom messages.
  const compiler = webpackFactory(config);

  // "invalid" event fires when you have changed a file, and Webpack is
  // recompiling a bundle. WebpackDevServer takes care to pause serving the
  // bundle, so if you refresh, it'll wait instead of serving the old one.
  // "invalid" is short for "bundle invalidated", it doesn't imply any errors.
  compiler.hooks.invalid.tap('invalid', () => {
    log(projectRoot, '\nCompiling...');
  });

  let isFirstCompile = true;

  // "done" event fires when Webpack has finished recompiling the bundle.
  // Whether or not you have warnings or errors, you will get this event.
  compiler.hooks.done.tap('done', async stats => {
    if (SHOULD_CLEAR_CONSOLE && !nonInteractive) {
      clearLogs();
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
      WebpackEnvironment.logEnvironmentInfo(projectRoot, CONSOLE_TAG, config);
    }

    if (isSuccessful && !isFirstCompile && !nonInteractive) {
      printInstructions(projectRoot, {
        appName,
        urls,
        shouldPrintHelp: true,
        showInDevtools: isFirstCompile,
      });
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
  WebpackEnvironment.logEnvironmentInfo(projectRoot, CONSOLE_TAG, config);

  if (!nonInteractive || isFirstCompile) {
    printInstructions(projectRoot, {
      appName,
      urls,
      showInDevtools: isFirstCompile,
    });
  }
}
