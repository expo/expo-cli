/**
 * @flow
 */

import { ProjectUtils, Project, UrlUtils } from 'xdl';

import chalk from 'chalk';
import simpleSpinner from '@expo/simple-spinner';
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

  await Project.startAsync(root, startOpts);

  log('Expo is ready.');

  let url = await UrlUtils.constructManifestUrlAsync(projectDir);

  let { exp } = await ProjectUtils.readConfigJsonAsync(projectDir);

  if (!exp.isDetached) {
    log('You can scan this QR code:\n');
    urlOpts.printQRCode(url);
  }

  log('Your URL is\n\n' + chalk.underline(url) + '\n');
  log.raw(url);

  const recipient = await sendTo.getRecipient(options.sendTo);
  if (recipient) {
    await sendTo.sendUrlAsync(url, recipient);
  }

  await urlOpts.handleMobileOptsAsync(projectDir, options);

  log(
    chalk.green(
      'Logs for your project will appear below. Press Ctrl+C to exit.'
    )
  );
}

export default (program: any) => {
  program
    .command('start [project-dir]')
    .alias('r')
    .description(
      'Starts or restarts a local server for your app and gives you a URL to it'
    )
    .option(
      '-s, --send-to [dest]',
      'A phone number or e-mail address to send a link to'
    )
    .option('-c, --clear', 'Clear the React Native packager cache')
    .urlOpts()
    .allowNonInteractive()
    .allowOffline()
    .asyncActionProjectDir(action, true);
};
