/**
 * @flow
 */

import { ProjectUtils, Project } from 'xdl';

import chalk from 'chalk';
import path from 'path';

import log from '../log';
import sendTo from '../sendTo';
import { installExitHooks } from '../exit';
import urlOpts from '../urlOpts';

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

  await Project.startAsync(root, startOpts);

  log('Expo is ready.');

  let { url, isUrlFallback } = await Project.getManifestUrlWithFallbackAsync(projectDir);

  let { exp } = await ProjectUtils.readConfigJsonAsync(projectDir);

  if (!exp.isDetached) {
    log('You can scan this QR code:');
    log.newLine();
    urlOpts.printQRCode(url);
  }

  log('Your URL is: ' + chalk.underline(url));
  if (isUrlFallback) {
    log.warn(
      'Switched to a LAN URL because the tunnel appears to be down. ' +
        'Only devices in the same network can access the app. ' +
        'Restart with `exp start` to try reconnecting.'
    );
  }

  const recipient = await sendTo.getRecipient(options.sendTo);
  if (recipient) {
    await sendTo.sendUrlAsync(url, recipient);
  }

  await urlOpts.handleMobileOptsAsync(projectDir, options);

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
    .allowNonInteractive()
    .allowOffline()
    .asyncActionProjectDir(action, true);
};
