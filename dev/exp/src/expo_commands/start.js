/**
 * @flow
 */

import { DevToolsServer } from '@expo/dev-tools';
import { ProjectUtils, ProjectSettings, Project, UserSettings } from 'xdl';
import chalk from 'chalk';
import opn from 'opn';
import path from 'path';

import prompt from '../prompt';
import log from '../log';
import sendTo from '../sendTo';
import { installExitHooks } from '../exit';
import urlOpts from '../urlOpts';
import printRunInstructionsAsync from '../printRunInstructionsAsync';

async function action(projectDir, options) {
  const projectState = await Project.currentStatus(projectDir);

  if (projectState === 'running') {
    log.error('exp is already running for this project. Exiting...');
    process.exit(1);
  } else if (projectState === 'ill') {
    log.warn(
      'exp may have exited improperly. Proceeding, but you should check for orphaned processes.'
    );
  }

  installExitHooks(projectDir);

  await urlOpts.optsAsync(projectDir, options);

  log(chalk.gray('Using project at', projectDir));

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

  log('Expo is ready.');
  log.newLine();

  let { url, isUrlFallback } = await Project.getManifestUrlWithFallbackAsync(projectDir);

  let { exp } = await ProjectUtils.readConfigJsonAsync(projectDir);

  if (!exp.isDetached) {
    urlOpts.printQRCode(url);
  }

  log('Your URL is: ' + chalk.underline(url));

  if (!exp.isDetached) {
    await printRunInstructionsAsync();
  }

  if (isUrlFallback) {
    await ProjectSettings.setAsync(projectDir, { hostType: 'lan' });

    log.warn(
      'Switched to a LAN URL because the tunnel appears to be down. ' +
        'Only devices in the same network can access the app. ' +
        'Restart with `exp start --tunnel` to try reconnecting.'
    );
  }

  const recipient = await sendTo.getRecipient(options.sendTo);
  if (recipient) {
    await sendTo.sendUrlAsync(url, recipient);
  }

  await urlOpts.handleMobileOptsAsync(projectDir, options);

  let devToolsEnabled = await UserSettings.getAsync('devToolsEnabled', null);
  if (devToolsEnabled == null && !options.nonInteractive) {
    log.nested(chalk.bold('Expo can display a browser UI to help you work on your project.'));
    ({ devToolsEnabled } = await prompt({
      name: 'devToolsEnabled',
      type: 'confirm',
      message: 'Do you want to launch Expo DevTools automatically?',
    }));
    await UserSettings.setAsync('devToolsEnabled', devToolsEnabled);
  }
  log(`Expo DevTools running at ${devToolsUrl}`);
  if (devToolsEnabled) {
    opn(devToolsUrl);
  }

  log(chalk.green('Logs for your project will appear below. Press Ctrl+C to exit.'));
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
    .asyncActionProjectDir(action, true);
};
