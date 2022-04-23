import {
  ExpoConfig,
  getConfig,
  getDefaultTarget,
  isLegacyImportsEnabled,
  PackageJSONConfig,
  ProjectTarget,
} from '@expo/config';
import spawnAsync from '@expo/spawn-async';
import chalk from 'chalk';
import fs from 'fs';
import { Ora } from 'ora';
import path from 'path';
import resolveFrom from 'resolve-from';
import { Project, UserManager } from 'xdl';

import CommandError, { ErrorCodes } from '../../CommandError';
import Log from '../../log';
import { logNewSection } from '../../utils/ora';
import { confirmAsync } from '../../utils/prompts';
import * as TerminalLink from '../utils/TerminalLink';
import { formatNamedWarning } from '../utils/logConfigWarnings';
import * as sendTo from '../utils/sendTo';

const EAS_UPDATE_URL = 'https://u.expo.dev';

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

export async function actionAsync(
  projectRoot: string,
  options: Options = {}
): Promise<Project.PublishedProjectResult> {
  assertValidReleaseChannel(options.releaseChannel);

  const { exp, pkg } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
  });
  await confirmExpoUpdatesInstalledAsync(projectRoot);
  assertUpdateURLCorrectlyConfigured(exp);
  const { sdkVersion, runtimeVersion } = exp;

  // TODO(@jkhales): remove this check when runtimeVersion policies are supported, if they are ever supported
  if (typeof runtimeVersion !== 'undefined' && typeof runtimeVersion !== 'string') {
    throw new CommandError(
      ErrorCodes.INVALID_RUNTIME_VERSION,
      `Runtime version policies are not supported by the publish command.`
    );
  }

  const target = options.target ?? getDefaultTarget(projectRoot);

  // note: this validates the exp.owner when the user is a robot
  const user = await UserManager.ensureLoggedInAsync();
  const owner = UserManager.getProjectOwner(user, exp);

  Log.addNewLineIfNone();

  // Log building info before building.
  // This gives the user sometime to bail out if the info is unexpected.
  if (runtimeVersion) {
    Log.log(`\u203A Runtime version: ${chalk.bold(runtimeVersion)}`);
  } else if (sdkVersion) {
    Log.log(`\u203A Expo SDK: ${chalk.bold(sdkVersion)}`);
  }
  Log.log(`\u203A Release channel: ${chalk.bold(options.releaseChannel)}`);
  Log.log(`\u203A Workflow: ${chalk.bold(target.replace(/\b\w/g, l => l.toUpperCase()))}`);
  if (user.kind === 'robot') {
    Log.log(`\u203A Owner: ${chalk.bold(owner)}`);
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

  let spinner: Ora | null = null;
  if (options.quiet) {
    spinner = logNewSection(`Building optimized bundles and generating sourcemaps...`);
  } else {
    Log.log(`Building optimized bundles and generating sourcemaps...`);
  }

  const result = await Project.publishAsync(projectRoot, {
    releaseChannel: options.releaseChannel,
    quiet: options.quiet,
    maxWorkers: options.maxWorkers,
    target,
    resetCache: options.clear,
  });

  const url = result.url;
  const projectPageUrl = result.projectPageUrl;

  if (options.quiet && spinner) {
    spinner.succeed();
  }

  Log.log('Publish complete');
  Log.newLine();

  logManifestUrl({ url, sdkVersion, runtimeVersion });

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

async function isExpoUpdatesInstalledAsync(projectDir: string): Promise<boolean> {
  try {
    resolveFrom(projectDir, 'expo-updates/package.json');
    return true;
  } catch (err: any) {
    Log.debug(err);
    return false;
  }
}

async function installExpoUpdatesAsync(projectDir: string): Promise<void> {
  const expoCliPath = resolveFrom(projectDir, 'expo/bin/cli.js');

  Log.newLine();
  Log.log(`Running ${chalk.bold('expo install expo-updates')}`);
  Log.newLine();
  await spawnAsync(expoCliPath, ['install', 'expo-updates']);
  Log.newLine();
}

async function confirmExpoUpdatesInstalledAsync(projectDir: string): Promise<void> {
  if (await isExpoUpdatesInstalledAsync(projectDir)) {
    return;
  }

  const isBare = getDefaultTarget(projectDir) === 'bare';
  if (isBare) {
    throw new CommandError(
      `This project is missing ${chalk.bold(
        'expo-updates'
      )}. Please install it in order to publish an update. ${chalk.dim(
        TerminalLink.learnMore('https://docs.expo.dev/bare/installing-updates/')
      )}`
    );
  }

  const install = await confirmAsync({
    message: `In order to publish an update, ${chalk.bold(
      'expo-updates'
    )} needs to be installed. Do you want to install it now?`,
  });

  if (install) {
    await installExpoUpdatesAsync(projectDir);
  } else {
    throw new CommandError(
      `This project is missing ${chalk.bold(
        'expo-updates'
      )}. Please install it in order to publish an update.`
    );
  }
}

function isMaybeAnEASUrl(url: string): boolean {
  return url.includes(EAS_UPDATE_URL);
}

function assertUpdateURLCorrectlyConfigured(exp: ExpoConfig): void {
  const configuredURL = exp.updates?.url;
  if (!configuredURL) {
    // If no URL is configured, we generate a classic updates URL in the expo-updates config-plugin.
    return;
  }
  if (isMaybeAnEASUrl(configuredURL)) {
    throw new CommandError(
      ErrorCodes.INVALID_UPDATE_URL,
      `It seems like your project is configured for EAS Update. Please use 'eas update' instead.`
    );
  }
}

/**
 * @example 📝  Manifest: https://exp.host/@bacon/my-app/index.exp?sdkVersion=38.0.0 Learn more: https://expo.fyi/manifest-url
 * @param options
 */
function logManifestUrl({
  url,
  sdkVersion,
  runtimeVersion,
}: {
  url: string;
  sdkVersion?: string;
  runtimeVersion?: string;
}) {
  const manifestUrl = getExampleManifestUrl(url, { sdkVersion, runtimeVersion }) ?? url;
  Log.log(
    `📝  Manifest: ${chalk.bold(TerminalLink.fallbackToUrl(url, manifestUrl))} ${chalk.dim(
      TerminalLink.learnMore('https://expo.fyi/manifest-url')
    )}`
  );
}

/**
 *
 * @example ⚙️   Project page: https://expo.dev/@bacon/projects/my-app [copied to clipboard] Learn more: https://expo.fyi/project-page
 * @param options
 */
function logProjectPageUrl({
  url,
  copiedToClipboard,
}: {
  url: string;
  copiedToClipboard: boolean;
}) {
  let productionMessage = `⚙️   Project page: ${chalk.bold(TerminalLink.fallbackToUrl(url, url))}`;

  if (copiedToClipboard) {
    productionMessage += ` ${chalk.gray(`[copied to clipboard]`)}`;
  }
  productionMessage += ` ${chalk.dim(TerminalLink.learnMore('https://expo.fyi/project-page'))}`;

  Log.log(productionMessage);
}

function getExampleManifestUrl(
  url: string,
  { sdkVersion, runtimeVersion }: { sdkVersion?: string; runtimeVersion?: string }
): string | null {
  if (!(sdkVersion || runtimeVersion)) {
    return null;
  }

  if (url.includes('release-channel') && url.includes('?release-channel')) {
    const urlWithIndexSuffix = url.replace('?release-channel', '/index.exp?release-channel');
    return runtimeVersion
      ? urlWithIndexSuffix + `&runtimeVersion=${runtimeVersion}`
      : urlWithIndexSuffix + `&sdkVersion=${sdkVersion}`;
  } else if (url.includes('?') && !url.includes('release-channel')) {
    // This is the only relevant url query param we are aware of at the time of
    // writing this code, so if there is some other param included we don't know
    // how to deal with it and log nothing.
    return null;
  } else {
    return runtimeVersion
      ? `${url}/index.exp?runtimeVersion=${runtimeVersion}`
      : `${url}/index.exp?sdkVersion=${sdkVersion}`;
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
      'https://docs.expo.dev/distribution/optimizing-updates/#optimize-images'
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
