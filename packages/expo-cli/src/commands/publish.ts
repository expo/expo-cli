import {
  getConfig,
  getDefaultTarget,
  isLegacyImportsEnabled,
  PackageJSONConfig,
  ProjectTarget,
} from '@expo/config';
import simpleSpinner from '@expo/simple-spinner';
import chalk from 'chalk';
import type { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { Project, UserManager } from 'xdl';

import CommandError from '../CommandError';
import Log from '../log';
import { getProjectOwner } from '../projects';
import * as sendTo from '../sendTo';
import * as TerminalLink from './utils/TerminalLink';
import { formatNamedWarning } from './utils/logConfigWarnings';

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

export async function action(
  projectRoot: string,
  options: Options = {}
): Promise<Project.PublishedProjectResult> {
  assertValidReleaseChannel(options.releaseChannel);

  const { exp, pkg } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
  });
  const { sdkVersion } = exp;

  const target = options.target ?? getDefaultTarget(projectRoot);

  // note: this validates the exp.owner when the user is a robot
  const user = await UserManager.ensureLoggedInAsync();
  const owner = getProjectOwner(user, exp);

  Log.addNewLineIfNone();

  // Log building info before building.
  // This gives the user sometime to bail out if the info is unexpected.

  if (sdkVersion) {
    Log.log(`\u203A Expo SDK: ${Log.chalk.bold(exp.sdkVersion)}`);
  }
  Log.log(`\u203A Release channel: ${Log.chalk.bold(options.releaseChannel)}`);
  Log.log(`\u203A Workflow: ${Log.chalk.bold(target.replace(/\b\w/g, l => l.toUpperCase()))}`);
  if (user.kind === 'robot') {
    Log.log(`\u203A Owner: ${Log.chalk.bold(owner)}`);
  }

  Log.newLine();

  // Log warnings.

  logExpoUpdatesWarnings(pkg);

  logOptimizeWarnings({ projectRoot });

  if (!options.target && target === 'bare' && isLegacyImportsEnabled(exp)) {
    logBareWorkflowWarnings(pkg);
  }

  Log.addNewLineIfNone();

  // Build and publish the project.

  Log.log(`Building optimized bundles and generating sourcemaps...`);

  if (options.quiet) {
    simpleSpinner.start();
  }

  const result = await Project.publishAsync(projectRoot, {
    releaseChannel: options.releaseChannel,
    quiet: options.quiet,
    target,
    resetCache: options.clear,
  });

  const url = result.url;
  const projectPageUrl = result.projectPageUrl;

  if (options.quiet) {
    simpleSpinner.stop();
  }

  Log.log('Publish complete');
  Log.newLine();

  logManifestUrl({ url, sdkVersion: exp.sdkVersion });

  if (target === 'managed' && projectPageUrl) {
    // note(brentvatne): disable copy to clipboard functionality for now, need to think more about
    // whether this is desirable.
    //
    // Attempt to copy the URL to the clipboard, if it succeeds then append a notice to the log.
    // const copiedToClipboard = copyToClipboard(websiteUrl);

    logProjectPageUrl({ url: projectPageUrl, copiedToClipboard: false });

    // Only send the link for managed projects.
    const recipient = await sendTo.getRecipient(options.sendTo);
    if (recipient) {
      await sendTo.sendUrlAsync(projectPageUrl, recipient);
    }
  }

  Log.newLine();

  return result;
}

export function isInvalidReleaseChannel(releaseChannel?: string): boolean {
  const channelRe = new RegExp(/^[a-z\d][a-z\d._-]*$/);
  return !!releaseChannel && !channelRe.test(releaseChannel);
}

// TODO(Bacon): should we prompt with a normalized value?
function assertValidReleaseChannel(releaseChannel?: string): void {
  if (isInvalidReleaseChannel(releaseChannel)) {
    throw new CommandError(
      'Release channel name can only contain lowercase letters, numbers and special characters . _ and -'
    );
  }
}

/**
 * @example 📝  Manifest: https://exp.host/@bacon/my-app/index.exp?sdkVersion=38.0.0 Learn more: https://expo.fyi/manifest-url
 * @param options
 */
function logManifestUrl({ url, sdkVersion }: { url: string; sdkVersion?: string }) {
  const manifestUrl = getExampleManifestUrl(url, sdkVersion) ?? url;
  Log.log(
    `📝  Manifest: ${Log.chalk.bold(TerminalLink.fallbackToUrl(url, manifestUrl))} ${Log.chalk.dim(
      TerminalLink.learnMore('https://expo.fyi/manifest-url')
    )}`
  );
}

/**
 *
 * @example ⚙️   Project page: https://expo.io/@bacon/projects/my-app [copied to clipboard] Learn more: https://expo.fyi/project-page
 * @param options
 */
function logProjectPageUrl({
  url,
  copiedToClipboard,
}: {
  url: string;
  copiedToClipboard: boolean;
}) {
  let productionMessage = `⚙️   Project page: ${Log.chalk.bold(
    TerminalLink.fallbackToUrl(url, url)
  )}`;

  if (copiedToClipboard) {
    productionMessage += ` ${Log.chalk.gray(`[copied to clipboard]`)}`;
  }
  productionMessage += ` ${Log.chalk.dim(TerminalLink.learnMore('https://expo.fyi/project-page'))}`;

  Log.log(productionMessage);
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

export function logExpoUpdatesWarnings(pkg: PackageJSONConfig): void {
  const hasConflictingUpdatesPackages =
    pkg.dependencies?.['expo-updates'] && pkg.dependencies?.['expokit'];

  if (!hasConflictingUpdatesPackages) {
    return;
  }

  Log.nestedWarn(
    formatNamedWarning(
      'Conflicting Updates',
      `You have both the ${chalk.bold('expokit')} and ${chalk.bold(
        'expo-updates'
      )} packages installed in package.json.\n  These two packages are incompatible and ${chalk.bold(
        'publishing updates with expo-updates will not work if expokit is installed'
      )}.\n  If you intend to use ${chalk.bold('expo-updates')}, please remove ${chalk.bold(
        'expokit'
      )} from your dependencies.`
    )
  );
}

export function logOptimizeWarnings({ projectRoot }: { projectRoot: string }): void {
  const hasOptimized = fs.existsSync(path.join(projectRoot, '/.expo-shared/assets.json'));
  if (hasOptimized) {
    return;
  }
  Log.nestedWarn(
    formatNamedWarning(
      'Optimization',
      `Project may contain uncompressed images. Optimizing image assets can improve app size and performance.\n  To fix this, run ${chalk.bold(
        `npx expo-optimize`
      )}`,
      'https://docs.expo.io/distribution/optimizing-updates/#optimize-images'
    )
  );
}

/**
 * Warn users if they attempt to publish in a bare project that may also be
 * using Expo Go and does not If the developer does not have the Expo
 * package installed then we do not need to warn them as there is no way that
 * it will run in Expo Go in development even. We should revisit this with
 * dev client, and possibly also by excluding SDK version for bare
 * expo-updates usage in the future (and then surfacing this as an error in
 * the Expo Go app instead)
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

  Log.nestedWarn(
    formatNamedWarning(
      'Workflow target',
      `This is a ${chalk.bold(
        'bare workflow'
      )} project. The resulting publish will only run properly inside of a native build of your project. If you want to publish a version of your app that will run in Expo Go, please use ${chalk.bold(
        'expo publish --target managed'
      )}. You can skip this warning by explicitly running ${chalk.bold(
        'expo publish --target bare'
      )} in the future.`
    )
  );
}

export default function (program: Command) {
  program
    .command('publish [path]')
    .alias('p')
    .description('Deploy a project to Expo hosting')
    .helpGroup('core')
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
