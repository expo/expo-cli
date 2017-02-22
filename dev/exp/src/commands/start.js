/**
 * @flow
 */

import {
  Project,
  UrlUtils,
} from 'xdl';

import crayon from '@ccheever/crayon';
import path from 'path';

import log from '../log';
import sendTo from '../sendTo';
import { installExitHooks } from '../exit';
import urlOpts from '../urlOpts';

async function action(projectDir, options) {
  const projectState = await Project.currentStatus(projectDir);

  if (projectState === 'running') {
    log.warn('exp is already running for this project. Exiting...');
    process.exit(1);
  } else if (projectState === 'ill') {
    log.warn('exp may have exited improperly. Proceeding, but you should check for orphaned processes.');
  }

  installExitHooks(projectDir);

  await urlOpts.optsAsync(projectDir, options);

  log(crayon.gray("Using project at", projectDir));

  let root = path.resolve(projectDir);
  let startOpts = {};
  if (options.clear) {
    startOpts.reset = true;
  }

  await Project.startAsync(root, startOpts);

  log("Exponent is ready.");

  let url = await UrlUtils.constructManifestUrlAsync(projectDir);

  log('You can scan this QR code:\n');
  urlOpts.printQRCode(url);

  log("Your URL is\n\n" + crayon.underline(url) + "\n");
  log.raw(url);

  const recipient = await sendTo.getRecipient(options.sendTo);
  if (recipient) {
    await sendTo.sendUrlAsync(url, recipient);
  }

  await urlOpts.handleMobileOptsAsync(projectDir, options);

  log(crayon.green('Logs for your project will appear below. Press Ctrl+C to exit.'));
}

export default (program: any) => {
  program
    .command('start [project-dir]')
    .alias('r')
    .description('Starts or restarts a local server for your app and gives you a URL to it')
    .option('-s, --send-to [dest]', 'A phone number or e-mail address to send a link to')
    .option('-c, --clear', 'Clear the React Native packager cache')
    .urlOpts()
    .allowOffline()
    .asyncActionProjectDir(action);
};
