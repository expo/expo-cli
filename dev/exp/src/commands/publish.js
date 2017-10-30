/**
 * @flow
 */

import chalk from 'chalk';
import simpleSpinner from '@expo/simple-spinner';

import { Project } from 'xdl';

import log from '../log';
import sendTo from '../sendTo';
import { installExitHooks } from '../exit';

type Options = {
  sendTo?: string,
  quiet?: boolean,
};

export async function action(projectDir: string, options: Options = {}) {
  if (
    options.releaseChannel !== 'default' &&
    options.releaseChannel !== 'staging' &&
    options.releaseChannel !== 'production'
  ) {
    log.error('Channel type must be one of {default, staging, production}');
    process.exit(1);
  }
  const status = await Project.currentStatus(projectDir);

  let startedOurOwn = false;
  if (status !== 'running') {
    log('Unable to find an existing exp instance for this directory, starting a new one...');
    installExitHooks(projectDir);
    await Project.startAsync(projectDir, {}, !options.quiet);
    startedOurOwn = true;
  }

  let recipient = await sendTo.getRecipient(options.sendTo);
  log('Publishing...');

  if (options.quiet) {
    simpleSpinner.start();
  }

  let result = await Project.publishAsync(projectDir, {
    releaseChannel: options.releaseChannel,
  });

  if (options.quiet) {
    simpleSpinner.stop();
  }

  log('Published');
  log('Your URL is\n\n' + chalk.underline(result.url) + '\n');
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
    .option(
      '-q, --quiet',
      'Suppress verbose output from the React Native packager.'
    )
    .option(
      '-s, --send-to [dest]',
      'A phone number or e-mail address to send a link to'
    )
    .option(
      '-c --release-channel <release channel>',
      "The release channel to publish to, one of {default, staging, prod}. Default is 'default'.",
      /^(default|staging|production)$/i,
      'default'
    )
    .allowNonInteractive()
    .asyncActionProjectDir(action, true);
};
