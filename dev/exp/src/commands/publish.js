/**
 * @flow
 */

import crayon from '@ccheever/crayon';
import simpleSpinner from '@exponent/simple-spinner';

import {
  Project,
} from 'xdl';

import log from '../log';
import sendTo from '../sendTo';
import { currentProjectStatus, installExitHooks } from '../status';

type Options = {
  sendTo?: string,
  verbose?: boolean,
};

export async function action(projectDir: string, options: Options = {}) {
  const status = await currentProjectStatus(projectDir);

  let startedOurOwn = false;
  if (status !== 'running') {
    log('Unable to find an existing exp instance for this directory, starting a new one...');
    installExitHooks(projectDir);
    await Project.startAsync(projectDir, {}, options.verbose || false);
    startedOurOwn = true;
  }

  let recipient = await sendTo.getRecipient(options.sendTo);
  log('Publishing...');

  if (!options.verbose) {
    simpleSpinner.start();
  }

  let result = await Project.publishAsync(projectDir);

  if (!options.verbose) {
    simpleSpinner.stop();
  }

  log('Published');
  log('Your URL is\n\n' + crayon.underline(result.url) + '\n');
  log.raw(result.url);

  if (recipient) {
    await sendTo.sendUrlAsync(result.url, recipient);
  }

  if (startedOurOwn) {
    await Project.stopAsync(projectDir);
  }

  return result;
}

export default (program: any) => {
  program
    .command('publish [project-dir]')
    .alias('p')
    .description('Publishes your project to exp.host')
    .option('-v, --verbose', 'Enable verbose output from the React Native packager.')
    .option('-s, --send-to [dest]', 'A phone number or e-mail address to send a link to')
    .asyncActionProjectDir(action);
};
