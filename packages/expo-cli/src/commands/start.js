/**
 * @flow
 */

import { DevToolsServer } from '@expo/dev-tools';
import { ProjectUtils, Web, Project, UserSettings, UrlUtils } from 'xdl';
import chalk from 'chalk';
import opn from 'opn';
import path from 'path';

import log from '../log';
import sendTo from '../sendTo';
import { installExitHooks } from '../exit';
import urlOpts from '../urlOpts';
import * as TerminalUI from './start/TerminalUI';

async function parseStartOptionsAsync(projectDir: string, options: Object): Promise<Object> {
  let startOpts = {};

  if (options.clear) {
    startOpts.reset = true;
  }

  if (options.maxWorkers) {
    startOpts.maxWorkers = options.maxWorkers;
  }

  if (options.webOnly) {
    startOpts.webOnly = options.webOnly;
  } else {
    startOpts.webOnly = await Web.onlySupportsWebAsync(projectDir);
  }
  return startOpts;
}

async function action(projectDir, options) {
  installExitHooks(projectDir);

  await urlOpts.optsAsync(projectDir, options);

  log(chalk.gray('Starting project at', projectDir));

  let rootPath = path.resolve(projectDir);
  let devToolsUrl = await DevToolsServer.startAsync(rootPath);
  log(`Expo DevTools is running at ${chalk.underline(devToolsUrl)}`);

  const { exp } = await ProjectUtils.readConfigJsonAsync(projectDir);
  if (exp === null) {
    log.warn('No Expo configuration found. Are you sure this is a project directory?');
    process.exit(1);
  }

  const nonInteractive = options.parent && options.parent.nonInteractive;
  if (!nonInteractive && !exp.isDetached) {
    if (await UserSettings.getAsync('openDevToolsAtStartup', true)) {
      log(`Opening DevTools in the browser... (press ${chalk.bold`shift-d`} to disable)`);
      opn(devToolsUrl, { wait: false });
    } else {
      log(
        `Press ${chalk.bold`d`} to open DevTools now, or ${chalk.bold`shift-d`} to always open it automatically.`
      );
    }
  }

  const startOpts = await parseStartOptionsAsync(projectDir, options);

  await Project.startAsync(rootPath, startOpts);

  const url = await UrlUtils.constructManifestUrlAsync(projectDir);

  const recipient = await sendTo.getRecipient(options.sendTo);
  if (recipient) {
    await sendTo.sendUrlAsync(url, recipient);
  }

  await urlOpts.handleMobileOptsAsync(projectDir, options);

  if (!nonInteractive && !exp.isDetachexped) {
    await TerminalUI.startAsync(projectDir, startOpts);
  } else {
    if (!options.webOnly) {
      if (!exp.isDetached) {
        log.newLine();
        urlOpts.printQRCode(url);
      }
      log(`Your app is running at ${chalk.underline(url)}`);
    }
  }

  log.nested(chalk.green('Logs for your project will appear below. Press Ctrl+C to exit.'));
}

export default (program: any) => {
  program
    .command('start [project-dir]')
    .alias('r')
    .description('Starts or restarts a local server for your app and gives you a URL to it')
    .option('-s, --send-to [dest]', 'An email address to send a link to')
    .option('-c, --clear', 'Clear the React Native packager cache')
    .option('--web-only', 'Only start the webpack server')
    // TODO(anp) set a default for this dynamically based on whether we're inside a container?
    .option('--max-workers [num]', 'Maximum number of tasks to allow Metro to spawn.')
    .urlOpts()
    .allowOffline()
    .asyncActionProjectDir(action, true, true);
};
