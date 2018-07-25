/**
 * @flow
 */

import { DevToolsServer } from '@expo/dev-tools';
import { ProjectUtils, ProjectSettings, Project, UserSettings, UrlUtils } from 'xdl';
import chalk from 'chalk';
import opn from 'opn';
import path from 'path';

import prompt from '../prompt';
import log from '../log';
import sendTo from '../sendTo';
import { installExitHooks } from '../exit';
import urlOpts from '../urlOpts';
import * as TerminalUI from './start/TerminalUI';

async function action(projectDir, options) {
  installExitHooks(projectDir);

  await urlOpts.optsAsync(projectDir, options);

  log(chalk.gray('Starting project at', projectDir));

  let root = path.resolve(projectDir);
  let startOpts = {};
  if (options.clear) {
    startOpts.reset = true;
  }

  if (options.maxWorkers) {
    startOpts.maxWorkers = options.maxWorkers;
  }

  let devToolsUrl = await DevToolsServer.startAsync(root);
  await Project.startAsync(root, startOpts);

  const url = await UrlUtils.constructManifestUrlAsync(projectDir);

  const recipient = await sendTo.getRecipient(options.sendTo);
  if (recipient) {
    await sendTo.sendUrlAsync(url, recipient);
  }

  await urlOpts.handleMobileOptsAsync(projectDir, options);

  const { exp } = await ProjectUtils.readConfigJsonAsync(projectDir);

  log(`Expo DevTools is running at ${chalk.underline(devToolsUrl)}`);
  if (!options.parent.nonInteractive && !exp.isDetached) {
    if (await UserSettings.getAsync('openDevToolsAtStartup', true)) {
      log(`Opening DevTools in the browser... (press ${chalk.bold`shift-d`} to disable)`);
      opn(devToolsUrl, { wait: false });
    } else {
      log(
        `Press ${chalk.bold`d`} to open DevTools now, or ${chalk.bold`shift-d`} to always open it automatically.`
      );
    }
    await TerminalUI.startAsync(projectDir);
  } else {
    if (!exp.isDetached) {
      log.newLine();
      urlOpts.printQRCode(url);
    }
    log(`Your app is running at ${chalk.underline(url)}`);
  }

  log.nested(chalk.green('Logs for your project will appear below. Press Ctrl+C to exit.'));
}

export default (program: any) => {
  program
    .command('start [project-dir]')
    .alias('r')
    .description('Starts or restarts a local server for your app and gives you a URL to it')
    .option('-s, --send-to [dest]', 'A phone number or e-mail address to send a link to')
    .option('-c, --clear', 'Clear the React Native packager cache')
    // TODO(anp) set a default for this dynamically based on whether we're inside a container?
    .option('--max-workers [num]', 'Maximum number of tasks to allow Metro to spawn.')
    .urlOpts()
    .allowOffline()
    .asyncActionProjectDir(action, true, true);
};
