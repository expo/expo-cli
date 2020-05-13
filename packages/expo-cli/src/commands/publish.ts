import { ProjectTarget, getConfig, getDefaultTarget } from '@expo/config';
import simpleSpinner from '@expo/simple-spinner';
import { Exp, Project, ProjectSettings } from '@expo/xdl';
import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import terminalLink from 'terminal-link';

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

  const { exp, pkg } = getConfig(projectDir, {
    skipSDKVersionRequirement: true,
  });

  if (pkg.dependencies['expo-updates'] && pkg.dependencies['expokit']) {
    log.warn(
      `Warning: You have both the ${chalk.bold('expokit')} and ${chalk.bold(
        'expo-updates'
      )} packages installed in package.json.`
    );
    log.warn(
      `These two packages are incompatible and ${chalk.bold(
        'publishing updates with expo-updates will not work if expokit is installed.'
      )}`
    );
    log.warn(
      `If you intend to use ${chalk.bold('expo-updates')}, please remove ${chalk.bold(
        'expokit'
      )} from your dependencies.`
    );
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

  const target = options.target ?? getDefaultTarget(projectDir);

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
        'Read more here: https://docs.expo.io/workflow/publishing/#limitations'
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

    log('Publish complete');
    log.newLine();

    let exampleManifestUrl = getExampleManifestUrl(url, exp.sdkVersion);
    if (exampleManifestUrl) {
      log(
        `The manifest URL is: ${terminalLink(url, exampleManifestUrl)}. ${terminalLink(
          'Learn more.',
          'https://expo.fyi/manifest-url'
        )}`
      );
    } else {
      log(
        `The manifest URL is: ${terminalLink(url, url)}. ${terminalLink(
          'Learn more.',
          'https://expo.fyi/manifest-url'
        )}`
      );
    }

    if (target === 'managed') {
      // TODO: replace with websiteUrl from server when it is available, if that makes sense.
      let websiteUrl = url.replace('exp.host', 'expo.io');
      log(
        `The project page is: ${terminalLink(websiteUrl, websiteUrl)}. ${terminalLink(
          'Learn more.',
          'https://expo.fyi/project-page'
        )}`
      );

      if (recipient) {
        await sendTo.sendUrlAsync(websiteUrl, recipient);
      }
    } else {
      // This seems pointless in bare?? Leaving it out
      // if (recipient) {
      //   await sendTo.sendUrlAsync(url, recipient);
      // }
    }
  } finally {
    if (startedOurOwn) {
      await Project.stopAsync(projectDir);
    }
  }
  return result;
}

function getExampleManifestUrl(url: string, sdkVersion: string | undefined): string | null {
  if (!sdkVersion) {
    return null;
  }

  if (url.includes('release-channel') && url.includes('?release-channel')) {
    return (
      url.replace('?release-channel', '/index.exp?release-channel') + `&sdkVersion=${sdkVersion}`
    );
  } else if (url.includes('?') && !url.includes('release-channel')) {
    // This is the only relevant url query param we are aware of at the time of
    // writing this code, so if there is some other param included we don't know
    // how to deal with it and log nothing.
    return null;
  } else {
    return `${url}/index.exp?sdkVersion=${sdkVersion}`;
  }
}

export default function (program: Command) {
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
    .asyncActionProjectDir(action);
}
