/**
 * @flow
 */

import {
  Project,
  ProjectSettings,
  UrlUtils,
} from 'xdl';

import crayon from '@ccheever/crayon';
import path from 'path';

import config from '../config';
import log from '../log';
import sendTo from '../sendTo';
import urlOpts from '../urlOpts';

function installExitHooks(projectDir) {
  // install ctrl+c handler that writes non-running state to directory
  if (process.platform === 'win32') {
    require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    .on("SIGINT", () => {
      process.emit("SIGINT");
    });
  }

  process.on('SIGINT', () => {
    console.log(crayon.blue('\nStopping packager...'));
    Promise.all([
      cleanUpPackager(projectDir),
      config.setProjectStatusAsync(projectDir, 'EXITED', null),
    ]).then(() => {
      console.log(crayon.green('Packager stopped.'));
      process.exit();
    });
  });
}

async function cleanUpPackager(projectDir) {
  const result = await Promise.race([
    Project.stopAsync(projectDir),
    new Promise((resolve, reject) => setTimeout(resolve, 1000, 'stopFailed')),
  ]);

  if (result === 'stopFailed') {
    // find RN packager and ngrok pids, attempt to kill them manually
    try {
      const { packagerPid, ngrokPid } = await ProjectSettings.readPackagerInfoAsync(projectDir);

      process.kill(packagerPid);
      process.kill(ngrokPid);
    } catch (e) {
      process.exit();
    }
  }
}

async function action(projectDir, options) {
  // check if we're already running elsewhere

  const previousState = await config.projectStatusAsync(projectDir);
  if (previousState === 'RUNNING') {
    // NOTE this might have bad state present if we failed to write our exiting
    // NOTE should we try to validate the packager pid before printing this? or take some other action?
    log.warn('exp is already running for this directory. Please kill the other process before proceeding.');
    process.exit(1);
    return;
  }

  installExitHooks(projectDir);

  await urlOpts.optsAsync(projectDir, options);

  log(crayon.gray("Using project at", process.cwd()));

  let root = path.resolve(process.cwd());
  let startOpts = {};
  if (options.clear) {
    startOpts.reset = true;
  }

  try {
    await Project.startAsync(root, startOpts);
    await config.setProjectStatusAsync(projectDir, 'RUNNING', null);
  } catch (e) {
    await config.setProjectStatusAsync(projectDir, 'ERROR', JSON.stringify(e));
    throw e;
  }

  log("Exponent is ready.");

  let url = await UrlUtils.constructManifestUrlAsync(projectDir);
  log("Your URL is\n\n" + crayon.underline(url) + "\n");
  log.raw(url);

  log('You can also scan this QR code:\n');
  urlOpts.printQRCode(url);

  const recipient = await sendTo.getRecipient(options.sendTo);
  if (recipient) {
    await sendTo.sendUrlAsync(url, recipient);
  }

  await urlOpts.handleMobileOptsAsync(projectDir, options);

  log(crayon.green('Logs for your project will appear below. Press Ctrl+C to exit.'));

  return config.projectExpJsonFile(projectDir).readAsync();
}

export default (program: any) => {
  program
    .command('start [project-dir]')
    .alias('r')
    .description('Starts or restarts a local server for your app and gives you a URL to it')
    .option('-s, --send-to [dest]', 'A phone number or e-mail address to send a link to')
    .option('-c, --clear', 'Clear the React Native packager cache')
    .urlOpts()
    .asyncActionProjectDir(action);
};
