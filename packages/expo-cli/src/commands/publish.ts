import { ProjectTarget, getConfig, getDefaultTargetAsync } from '@expo/config';
import simpleSpinner from '@expo/simple-spinner';
import { Exp, Project, ProjectSettings } from '@expo/xdl';
import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';

import { installExitHooks } from '../exit';
import log from '../log';
import sendTo from '../sendTo';

type Options = {
  clear?: boolean;
  sendTo?: string | boolean;
  quiet?: boolean;
  target?: ProjectTarget;
  releaseChannel?: string;
  duringBuild?: boolean;
  maxWorkers?: number;
  parent?: { nonInteractive: boolean };
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
    log.warn(
      'Warning: Your project may contain unoptimized image assets. Smaller image sizes can improve app performance.'
    );
    log.warn(
      `To compress the images in your project, abort publishing and run ${chalk.bold(
        'npx expo-optimize'
      )}.`
    );
  }

  const target = options.target ?? (await getDefaultTargetAsync(projectDir));

  const status = await Project.currentStatus(projectDir);
  let shouldStartOurOwn = false;

  if (status === 'running') {
    const packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectDir);
    const runningPackagerTarget = packagerInfo.target ?? 'managed';
    if (target !== runningPackagerTarget) {
      log(
        'Found an existing Expo CLI instance running for this project but the target did not match.'
      );
      await Project.stopAsync(projectDir);
      log('Starting a new Expo CLI instance...');
      shouldStartOurOwn = true;
    }
  } else {
    log('Unable to find an existing Expo CLI instance for this directory; starting a new one...');
    shouldStartOurOwn = true;
  }

  let startedOurOwn = false;
  if (shouldStartOurOwn) {
    installExitHooks(projectDir);

    const startOpts: Project.StartOptions = {
      reset: options.clear,
      nonPersistent: true,
      target,
    };
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

  let buildStatus;
  if (process.env.EXPO_LEGACY_API === 'true') {
    buildStatus = await Project.buildAsync(projectDir, {
      mode: 'status',
      platform: 'all',
      current: true,
      releaseChannel: options.releaseChannel,
      sdkVersion,
    });
  } else {
    buildStatus = await Project.getBuildStatusAsync(projectDir, {
      platform: 'all',
      current: true,
      releaseChannel: options.releaseChannel,
      sdkVersion,
    });
  }

  const { exp } = getConfig(projectDir, {
    skipSDKVersionRequirement: true,
  });

  if (
    'userHasBuiltExperienceBefore' in buildStatus &&
    buildStatus.userHasBuiltExperienceBefore &&
    !buildStatus.userHasBuiltAppBefore &&
    !options.duringBuild &&
    !exp.isDetached
  ) {
    log.warn(
      'We noticed that you have not built a standalone app with this SDK version and release channel before. ' +
        'Remember that OTA updates will only work for builds with matching SDK versions and release channels. ' +
        'Read more here: https://docs.expo.io/versions/latest/workflow/publishing/#limitations'
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

export default function(program: Command) {
  program
    .command('publish [project-dir]')
    .alias('p')
    .description('Publishes your project to exp.host')
    .option('-q, --quiet', 'Suppress verbose output from the React Native packager.')
    .option('-s, --send-to [dest]', 'A phone number or email address to send a link to')
    .option('-c, --clear', 'Clear the React Native packager cache')
    .option(
      '-t, --target [env]',
      'Target environment for which this publish is intended. Options are `managed` or `bare`.'
    )
    // TODO(anp) set a default for this dynamically based on whether we're inside a container?
    .option('--max-workers [num]', 'Maximum number of tasks to allow Metro to spawn.')
    .option(
      '--release-channel <release channel>',
      "The release channel to publish to. Default is 'default'.",
      'default'
    )
    .asyncActionProjectDir(action, true);
}
