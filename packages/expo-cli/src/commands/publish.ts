import { ProjectTarget, getConfig, getDefaultTarget } from '@expo/config';
import simpleSpinner from '@expo/simple-spinner';
import { Exp, Project } from '@expo/xdl';
import chalk from 'chalk';
import clipboard from 'clipboardy';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import terminalLink from 'terminal-link';

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
  const channelRe = new RegExp(/^[a-z\d][a-z\d._-]*$/);
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
      'Warning: your project may contain unoptimized image assets. Smaller image sizes can improve app performance.'
    );
    log.warn(
      `To compress the images in your project, abort publishing and run ${chalk.bold(
        'npx expo-optimize'
      )}.`
    );
    log.newLine();
  }

  const target = options.target ?? getDefaultTarget(projectDir);

  // Warn users if they attempt to publish in a bare project that may also be
  // using Expo client and does not If the developer does not have the Expo
  // package installed then we do not need to warn them as there is no way that
  // it will run in Expo client in development even. We should revisit this with
  // dev client, and possibly also by excluding SDK version for bare
  // expo-updates usage in the future (and then surfacing this as an error in
  // the Expo client app instead)
  // Related: https://github.com/expo/expo/issues/9517
  if (pkg.dependencies['expo'] && !options.target && target === 'bare') {
    log.warn(
      `Warning: this is a ${chalk.bold(
        'bare workflow'
      )} project. The resulting publish will only run properly inside of a native build of your project.`
    );

    log.warn(
      `If you want to publish a version of your app that will run in Expo client, please use ${chalk.bold(
        'expo publish --target managed'
      )}.`
    );

    log.warn(
      `You can skip this warning by explicitly running ${chalk.bold(
        'expo publish --target bare'
      )} in the future.`
    );
    log.newLine();
  }

  const recipient = await sendTo.getRecipient(options.sendTo);
  log(`Publishing to channel '${options.releaseChannel}'...`);

  const {
    args: { sdkVersion },
  } = await Exp.getPublishInfoAsync(projectDir);

  const buildStatus = await Project.getBuildStatusAsync(projectDir, {
    platform: 'all',
    current: true,
    releaseChannel: options.releaseChannel,
    sdkVersion,
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
        'Read more here: https://docs.expo.io/workflow/publishing/#limitations'
    );
  }

  if (options.quiet) {
    simpleSpinner.start();
  }

  const result = await Project.publishAsync(projectDir, {
    releaseChannel: options.releaseChannel,
    quiet: options.quiet,
    target,
  });

  const url = result.url;

  if (options.quiet) {
    simpleSpinner.stop();
  }

  log('Publish complete');
  log.newLine();

  const manifestUrl = getExampleManifestUrl(url, exp.sdkVersion) ?? url;
  log(
    `📝  Manifest: ${log.chalk.bold(urlTerminalLink(url, manifestUrl))} ${log.chalk.dim(
      learnMoreTerminalLink('https://expo.fyi/manifest-url')
    )}`
  );

  if (target === 'managed') {
    // TODO: replace with websiteUrl from server when it is available, if that makes sense.
    const websiteUrl = url.replace('exp.host', 'expo.io');

    let productionMessage = `⚙️   Project page: ${log.chalk.bold(
      urlTerminalLink(websiteUrl, websiteUrl)
    )}`;
    try {
      clipboard.writeSync(websiteUrl);
      productionMessage += ` ${log.chalk.gray(`[copied to clipboard]`)}`;
    } catch {}
    productionMessage += ` ${log.chalk.dim(
      learnMoreTerminalLink('https://expo.fyi/project-page')
    )}`;

    log(productionMessage);

    if (recipient) {
      await sendTo.sendUrlAsync(websiteUrl, recipient);
    }
  } else {
    // This seems pointless in bare?? Leaving it out
    // if (recipient) {
    //   await sendTo.sendUrlAsync(url, recipient);
    // }
  }

  log.newLine();

  return result;
}

function urlTerminalLink(shortUrl: string, url: string): string {
  // when terminal link isn't available, fallback to showing the longer link.
  return terminalLink(shortUrl, url, {
    fallback: (text, url) => url,
  });
}

function learnMoreTerminalLink(url: string): string {
  // when terminal link isn't available, format the learn more link better.
  return terminalLink(log.chalk.underline('Learn more.'), url, {
    fallback: (text, url) => `Learn more: ${log.chalk.underline(url)}`,
  });
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
    .option('-q, --quiet', 'Suppress verbose output from the Metro bundler.')
    .option('-s, --send-to [dest]', 'A phone number or email address to send a link to')
    .option('-c, --clear', 'Clear the Metro bundler cache')
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
