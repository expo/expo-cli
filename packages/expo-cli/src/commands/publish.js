/**
 * @flow
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import simpleSpinner from '@expo/simple-spinner';

import { Exp, Project, ProjectUtils } from 'xdl';

import log from '../log';
import prompt from '../prompt';
import sendTo from '../sendTo';
import { action as optimize } from './optimize';
import { installExitHooks } from '../exit';

type Options = {
  clear?: boolean,
  sendTo?: string,
  quiet?: boolean,
  releaseChannel?: string,
  duringBuild?: boolean,
};

export async function action(projectDir: string, options: Options = {}) {
  let channelRe = new RegExp(/^[a-z\d][a-z\d._-]*$/);
  if (options.releaseChannel && !channelRe.test(options.releaseChannel)) {
    log.error(
      'Release channel name can only contain lowercase letters, numbers and special characters . _ and -'
    );
    process.exit(1);
  }
  const hasOptimized = fs.existsSync(path.join(projectDir, '/.expo-shared/assets.json'));
  const nonInteractive = options.parent && options.parent.nonInteractive;
  if (!hasOptimized && !nonInteractive) {
    log.warn('It seems your assets have not been optimized yet.');
    const { allowOptimization } = await prompt({
      type: 'confirm',
      name: 'allowOptimization',
      message: 'Do you want to optimize assets now?',
    });
    if (allowOptimization) {
      await optimize(projectDir);
    }
  }
  const status = await Project.currentStatus(projectDir);

  let startedOurOwn = false;
  if (status !== 'running') {
    log('Unable to find an existing Expo CLI instance for this directory, starting a new one...');
    installExitHooks(projectDir);

    const startOpts = { reset: options.clear, nonPersistent: true };
    if (options.maxWorkers) {
      startOpts.maxWorkers = options.maxWorkers;
    }

    await Project.startAsync(projectDir, startOpts, !options.quiet);
    startedOurOwn = true;
  }

  let recipient = await sendTo.getRecipient(options.sendTo);
  log(`Publishing to channel '${options.releaseChannel}'...`);

  const {
    args: { sdkVersion },
  } = await Exp.getPublishInfoAsync(projectDir);

  const buildStatus = await Project.buildAsync(projectDir, {
    mode: 'status',
    platform: 'all',
    current: true,
    releaseChannel: options.releaseChannel,
    sdkVersion,
  });

  const { exp } = await ProjectUtils.readConfigJsonAsync(projectDir);

  if (
    buildStatus.userHasBuiltExperienceBefore &&
    !buildStatus.userHasBuiltAppBefore &&
    !options.duringBuild &&
    !exp.isDetached
  ) {
    log.warn(
      'We noticed you did not build a standalone app with this SDK version and release channel before. ' +
        'Remember that OTA updates will not work with the app built with different SDK version and/or release channel. ' +
        'Read more: https://docs.expo.io/versions/latest/workflow/publishing/#limitations'
    );
  }

  if (options.quiet) {
    simpleSpinner.start();
  }

  let result;
  try {
    result = await Project.publishAsync(projectDir, {
      releaseChannel: options.releaseChannel,
    });

    let url = result.url;

    if (options.quiet) {
      simpleSpinner.stop();
    }

    log('Published');
    log('Your URL is\n\n' + chalk.underline(url) + '\n');
    log.raw(url);

    if (recipient) {
      await sendTo.sendUrlAsync(url, recipient);
    }
  } finally {
    if (startedOurOwn) {
      await Project.stopAsync(projectDir);
    }
  }
  return result;
}

export default (program: any) => {
  program
    .command('publish [project-dir]')
    .alias('p')
    .description('Publishes your project to exp.host')
    .option('-q, --quiet', 'Suppress verbose output from the React Native packager.')
    .option('-s, --send-to [dest]', 'A phone number or email address to send a link to')
    .option('-c, --clear', 'Clear the React Native packager cache')
    // TODO(anp) set a default for this dynamically based on whether we're inside a container?
    .option('--max-workers [num]', 'Maximum number of tasks to allow Metro to spawn.')
    .option(
      '--release-channel <release channel>',
      "The release channel to publish to. Default is 'default'.",
      'default'
    )
    .asyncActionProjectDir(action, true);
};
