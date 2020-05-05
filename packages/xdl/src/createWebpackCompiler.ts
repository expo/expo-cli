/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import chalk from 'chalk';
import clearConsole from 'react-dev-utils/clearConsole';
import formatWebpackMessages from 'react-dev-utils/formatWebpackMessages';
import boxen from 'boxen';
import { Urls } from 'react-dev-utils/WebpackDevServerUtils';
import webpack from 'webpack';

import * as ProjectUtils from './project/ProjectUtils';
import { logEnvironmentInfo, shouldWebpackClearLogs } from './Web';

const CONSOLE_TAG = 'expo';

const SHOULD_CLEAR_CONSOLE = shouldWebpackClearLogs();

const PLATFORM_TAG = ProjectUtils.getPlatformTag('web');

const withTag = (...messages: any[]) => [PLATFORM_TAG + ' ', ...messages].join('');

function log(projectRoot: string, message: string, showInDevtools = true) {
  if (showInDevtools) {
    ProjectUtils.logInfo(projectRoot, CONSOLE_TAG, message);
  } else {
    console.log(message);
  }
}

function logWarning(projectRoot: string, message: string) {
  ProjectUtils.logWarning(projectRoot, CONSOLE_TAG, withTag(message));
}

function logError(projectRoot: string, message: string) {
  ProjectUtils.logError(projectRoot, CONSOLE_TAG, withTag(message));
}

export function printInstructions(
  projectRoot: string,
  {
    appName,
    urls,
    showInDevtools,
    showHelp,
  }: {
    appName: string;
    urls: Urls;
    showInDevtools: boolean;
    showHelp: boolean;
  }
) {
  printPreviewNotice(projectRoot, showInDevtools);

  let message = '\n';
  message += `${ProjectUtils.getPlatformTag('React')} You can now view ${chalk.bold(
    appName
  )} in the browser.\n`;

  if (urls.lanUrlForTerminal) {
    message += `\n  ${chalk.bold('Local:')}            ${urls.localUrlForTerminal}`;
    message += `\n  ${chalk.bold('On Your Network:')}  ${urls.lanUrlForTerminal}`;
  } else {
    message += `\n  ${urls.localUrlForTerminal}`;
  }

  message += `\n\nNote that the development build is not optimized.\n`;

  message += `\n \u203A To create a production build, run ${chalk.bold(`expo build:web`)}`;
  message += `\n \u203A Press ${chalk.bold(`w`)} to open the project in browser.`;
  message += `\n \u203A Press ${chalk.bold(`Ctrl+C`)} to exit.`;

  log(projectRoot, message, showInDevtools);

  if (showHelp) {
    const PLATFORM_TAG = ProjectUtils.getPlatformTag('Expo');
    log(
      projectRoot,
      `\n${PLATFORM_TAG} Press ${chalk.bold('?')} to show a list of all available commands.`,
      showInDevtools
    );
  }
}

export function printPreviewNotice(projectRoot: string, showInDevtools: boolean) {
  log(
    projectRoot,
    boxen(
      chalk.magenta(
        'Expo web is in beta, please report any bugs or missing features on the Expo repo.\n' +
          'You can follow the V1 release for more info: https://github.com/expo/expo/issues/6782'
      ),
      { borderColor: 'magenta', padding: 1 }
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
      logEnvironmentInfo(projectRoot, CONSOLE_TAG, config);
    }

    if (isSuccessful && !isFirstCompile && !nonInteractive) {
      printInstructions(projectRoot, {
        appName,
        urls,
        showInDevtools: isFirstCompile,
        showHelp: true,
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
  logEnvironmentInfo(projectRoot, CONSOLE_TAG, config);

  if (!nonInteractive || isFirstCompile) {
    printInstructions(projectRoot, {
      appName,
      urls,
      showInDevtools: isFirstCompile,
      showHelp: false,
    });
  }
}
