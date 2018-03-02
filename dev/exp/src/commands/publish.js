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
  clear?: boolean,
  sendTo?: string,
  quiet?: boolean,
  releaseChannel?: string,
};

export async function action(projectDir: string, options: Options = {}) {
  let channelRe = new RegExp(/^[a-z\d][a-z\d._-]*$/);
  if (options.releaseChannel && !channelRe.test(options.releaseChannel)) {
    log.error(
      'Release channel name can only contain lowercase letters, numbers and special characters . _ and -'
    );
    process.exit(1);
  }
  const status = await Project.currentStatus(projectDir);

  let startedOurOwn = false;
  if (status !== 'running') {
    log('Unable to find an existing exp instance for this directory, starting a new one...');
    installExitHooks(projectDir);

    const startOpts = { reset: options.clear, nonPersistent: true };
    if (options.maxWorkers) {
      startOpts.maxWorkers = options.maxWorkers;
    }

    await Project.startAsync(
      projectDir,
      startOpts,
      !options.quiet,
    );
    startedOurOwn = true;
  }

  let recipient = await sendTo.getRecipient(options.sendTo);
  log(`Publishing to channel '${options.releaseChannel}'...`);

  if (options.quiet) {
    simpleSpinner.start();
  }

  let result = await Project.publishAsync(projectDir, {
    releaseChannel: options.releaseChannel,
  });

  let url = result.url;

  // Append the query param for the release channel to the URL.
  // When we integrate release channels into XDE, we can revisit this and
  // perhaps push the logic for this into xdl
  if (options.releaseChannel && options.releaseChannel !== 'default') {
    url = `${url}?release-channel=${options.releaseChannel}`;
  }

  if (options.quiet) {
    simpleSpinner.stop();
  }

  log('Published');
  log('Your URL is\n\n' + chalk.underline(url) + '\n');
  log.raw(url);

  if (recipient) {
    await sendTo.sendUrlAsync(url, recipient);
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
    .option('-q, --quiet', 'Suppress verbose output from the React Native packager.')
    .option('-s, --send-to [dest]', 'A phone number or e-mail address to send a link to')
    .option('-c, --clear', 'Clear the React Native packager cache')
    // TODO(anp) set a default for this dynamically based on whether we're inside a container?
    .option('--max-workers [num]', 'Maximum number of tasks to allow Metro to spawn.')
    .option(
      '--release-channel <release channel>',
      "The release channel to publish to. Default is 'default'.",
      'default'
    )
    .allowNonInteractive()
    .asyncActionProjectDir(action, true);
};
