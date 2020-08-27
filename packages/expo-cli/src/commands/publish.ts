import { PackageJSONConfig, ProjectTarget, getConfig, getDefaultTarget } from '@expo/config';
import simpleSpinner from '@expo/simple-spinner';
import { Exp, Project } from '@expo/xdl';
import chalk from 'chalk';
import clipboard from 'clipboardy';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';

import log from '../log';
import sendTo from '../sendTo';
import * as TerminalLink from './utils/TerminalLink';

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

export function isInvalidReleaseChannel(releaseChannel?: string): boolean {
  const channelRe = new RegExp(/^[a-z\d][a-z\d._-]*$/);
  return !!releaseChannel && !channelRe.test(releaseChannel);
}

// TODO(Bacon): should we prompt with a normalized value?
function assertValidReleaseChannel(releaseChannel?: string): void {
  if (isInvalidReleaseChannel(releaseChannel)) {
    log.error(
      'Release channel name can only contain lowercase letters, numbers and special characters . _ and -'
    );
    process.exit(1);
  }
}

export async function action(
  projectDir: string,
  options: Options = {}
): Promise<Project.PublishedProjectResult> {
  assertValidReleaseChannel(options.releaseChannel);

  const { exp, pkg } = getConfig(projectDir, {
    skipSDKVersionRequirement: true,
  });

  logExpoUpdatesWarnings(pkg);

  logOptimizeWarnings({ projectRoot: projectDir });

  const target = options.target ?? getDefaultTarget(projectDir);

  if (!options.target && target === 'bare') {
    logBareWorkflowWarnings(pkg);
  }

  if (!exp.isDetached && !options.duringBuild) {
    await logSDKMismatchWarningsAsync({
      projectRoot: projectDir,
      releaseChannel: options.releaseChannel,
    });
  }

  // Log building info before building.
  // This gives the user sometime to bail out if the info is unexpected.
  log.addNewLineIfNone();

  log(`Building optimized bundle`);
  log(log.chalk.dim(`- Release channel: ${log.chalk.bold(options.releaseChannel)}`));
  log(
    log.chalk.dim(`- Workflow: ${log.chalk.bold(target.replace(/\b\w/g, l => l.toUpperCase()))}`)
  );
  if (target === 'managed' && exp.sdkVersion) {
    log(log.chalk.dim(`- Expo SDK: ${log.chalk.bold(exp.sdkVersion)}`));
  }

  if (options.quiet) {
    simpleSpinner.start();
  }

  log.newLine();

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

  logManifestUrl({ url, sdkVersion: exp.sdkVersion });

  if (target === 'managed') {
    // TODO: replace with websiteUrl from server when it is available, if that makes sense.
    const websiteUrl = url.replace('exp.host', 'expo.io');

    // Attempt to copy the URL to the clipboard, if it succeeds then append a notice to the log.
    const copiedToClipboard = copyToClipboard(url);

    logProjectPageUrl({ url: websiteUrl, copiedToClipboard });

    // Only send the link for managed projects.
    const recipient = await sendTo.getRecipient(options.sendTo);
    if (recipient) {
      await sendTo.sendUrlAsync(websiteUrl, recipient);
    }
  }

  log.newLine();

  return result;
}

/**
 * @example 📝  Manifest: https://exp.host/@bacon/my-app/index.exp?sdkVersion=38.0.0 Learn more: https://expo.fyi/manifest-url
 * @param options
 */
function logManifestUrl({ url, sdkVersion }: { url: string; sdkVersion?: string }) {
  const manifestUrl = getExampleManifestUrl(url, sdkVersion) ?? url;
  log(
    `📝  Manifest: ${log.chalk.bold(TerminalLink.fallbackToUrl(url, manifestUrl))} ${log.chalk.dim(
      TerminalLink.learnMore('https://expo.fyi/manifest-url')
    )}`
  );
}

function copyToClipboard(value: string): boolean {
  try {
    clipboard.writeSync(value);
    return true;
  } catch {}
  return false;
}

/**
 *
 * @example ⚙️   Project page: https://expo.io/@bacon/my-app [copied to clipboard] Learn more: https://expo.fyi/project-page
 * @param options
 */
function logProjectPageUrl({
  url,
  copiedToClipboard,
}: {
  url: string;
  copiedToClipboard: boolean;
}) {
  let productionMessage = `⚙️   Project page: ${log.chalk.bold(
    TerminalLink.fallbackToUrl(url, url)
  )}`;

  if (copiedToClipboard) {
    productionMessage += ` ${log.chalk.gray(`[copied to clipboard]`)}`;
  }
  productionMessage += ` ${log.chalk.dim(TerminalLink.learnMore('https://expo.fyi/project-page'))}`;

  log(productionMessage);
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

/**
 * A convenient warning reminding people that they're publishing with an SDK that their published app does not support.
 *
 * @param options
 */
async function logSDKMismatchWarningsAsync({
  projectRoot,
  releaseChannel,
}: {
  projectRoot: string;
  releaseChannel?: string;
}) {
  // Get the published SDK version.
  const {
    args: { sdkVersion },
  } = await Exp.getPublishInfoAsync(projectRoot);

  const buildStatus = await Project.getBuildStatusAsync(projectRoot, {
    platform: 'all',
    current: true,
    releaseChannel,
    sdkVersion,
  });
  if (buildStatus.userHasBuiltExperienceBefore && !buildStatus.userHasBuiltAppBefore) {
    log.warn(
      'We noticed that you have not built a standalone app with this SDK version and release channel before. ' +
        'Remember that OTA updates will only work for builds with matching SDK versions and release channels. ' +
        'Read more here: https://docs.expo.io/workflow/publishing/#limitations'
    );
  }
}

export function logExpoUpdatesWarnings(pkg: PackageJSONConfig): void {
  if (pkg.dependencies?.['expo-updates'] && pkg.dependencies?.['expokit']) {
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
}

export function logOptimizeWarnings({ projectRoot }: { projectRoot: string }): void {
  const hasOptimized = fs.existsSync(path.join(projectRoot, '/.expo-shared/assets.json'));
  if (!hasOptimized) {
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
}

/**
 * Warn users if they attempt to publish in a bare project that may also be
 * using Expo client and does not If the developer does not have the Expo
 * package installed then we do not need to warn them as there is no way that
 * it will run in Expo client in development even. We should revisit this with
 * dev client, and possibly also by excluding SDK version for bare
 * expo-updates usage in the future (and then surfacing this as an error in
 * the Expo client app instead)
 *
 * Related: https://github.com/expo/expo/issues/9517
 *
 * @param pkg package.json
 */
export function logBareWorkflowWarnings(pkg: PackageJSONConfig) {
  const hasExpoInstalled = pkg.dependencies?.['expo'];
  if (!hasExpoInstalled) {
    return;
  }
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

export default function(program: Command) {
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
