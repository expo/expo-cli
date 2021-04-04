import { ExpoConfig, getConfig, modifyConfigAsync } from '@expo/config';
import got from 'got';
import { UserManager } from 'xdl';

import CommandError, { SilentError } from '../../CommandError';
import Log from '../../log';
import prompt, { confirmAsync } from '../../prompts';
import { learnMore } from '../utils/TerminalLink';
import { isUrlAvailableAsync } from '../utils/url';

const noBundleIdMessage = `Your project must have a \`bundleIdentifier\` set in the Expo config (app.json or app.config.js).\nSee https://expo.fyi/bundle-identifier`;
const noPackageMessage = `Your project must have a \`package\` set in the Expo config (app.json or app.config.js).\nSee https://expo.fyi/android-package`;

export function validateBundleId(value: string): boolean {
  return /^[a-zA-Z0-9-.]+$/.test(value);
}

function validatePackage(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(value);
}

const cachedBundleIdResults: Record<string, string> = {};
const cachedPackageNameResults: Record<string, string> = {};

/**
 * A quality of life method that provides a warning when the bundle ID is already in use.
 *
 * @param bundleId
 */
async function getBundleIdWarningAsync(bundleId: string): Promise<string | null> {
  // Prevent fetching for the same ID multiple times.
  if (cachedBundleIdResults[bundleId]) {
    return cachedBundleIdResults[bundleId];
  }

  if (!(await isUrlAvailableAsync('itunes.apple.com'))) {
    // If no network, simply skip the warnings since they'll just lead to more confusion.
    return null;
  }

  const url = `http://itunes.apple.com/lookup?bundleId=${bundleId}`;
  try {
    const response = await got(url);
    const json = JSON.parse(response.body?.trim());
    if (json.resultCount > 0) {
      const firstApp = json.results[0];
      const message = formatInUseWarning(firstApp.trackName, firstApp.sellerName, bundleId);
      cachedBundleIdResults[bundleId] = message;
      return message;
    }
  } catch {
    // Error fetching itunes data.
  }
  return null;
}

async function getPackageNameWarningAsync(packageName: string): Promise<string | null> {
  // Prevent fetching for the same ID multiple times.
  if (cachedPackageNameResults[packageName]) {
    return cachedPackageNameResults[packageName];
  }

  if (!(await isUrlAvailableAsync('play.google.com'))) {
    // If no network, simply skip the warnings since they'll just lead to more confusion.
    return null;
  }

  const url = `https://play.google.com/store/apps/details?id=${packageName}`;
  try {
    const response = await got(url);
    // If the page exists, then warn the user.
    if (response.statusCode === 200) {
      // There is no JSON API for the Play Store so we can't concisely
      // locate the app name and developer to match the iOS warning.
      const message = `⚠️  The package ${Log.chalk.bold(
        packageName
      )} is already in use. ${Log.chalk.dim(learnMore(url))}`;
      cachedPackageNameResults[packageName] = message;
      return message;
    }
  } catch {
    // Error fetching play store data or the page doesn't exist.
  }
  return null;
}

function formatInUseWarning(appName: string, author: string, id: string): string {
  return `⚠️  The app ${Log.chalk.bold(appName)} by ${Log.chalk.italic(
    author
  )} is already using ${Log.chalk.bold(id)}`;
}

export async function getOrPromptForBundleIdentifier(projectRoot: string): Promise<string> {
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });

  const currentBundleId = exp.ios?.bundleIdentifier;
  if (currentBundleId) {
    if (validateBundleId(currentBundleId)) {
      return currentBundleId;
    }
    throw new CommandError(
      `The ios.bundleIdentifier defined in your Expo config is not formatted properly. Only alphanumeric characters, '.', '-', and '_' are allowed, and each '.' must be followed by a letter.`
    );
  }

  // Recommend a bundle ID based on the username and project slug.
  let recommendedBundleId: string | undefined;
  // Attempt to use the android package name first since it's convenient to have them aligned.
  if (exp.android?.package && validateBundleId(exp.android?.package)) {
    recommendedBundleId = exp.android?.package;
  } else {
    const username = exp.owner ?? (await UserManager.getCurrentUsernameAsync());
    const possibleId = `com.${username}.${exp.slug}`;
    if (username && validateBundleId(possibleId)) {
      recommendedBundleId = possibleId;
    }
  }

  Log.addNewLineIfNone();
  Log.log(
    `${Log.chalk.bold(`📝  iOS Bundle Identifier`)} ${Log.chalk.dim(
      learnMore('https://expo.fyi/bundle-identifier')
    )}`
  );
  Log.newLine();
  // Prompt the user for the bundle ID.
  // Even if the project is using a dynamic config we can still
  // prompt a better error message, recommend a default value, and help the user
  // validate their custom bundle ID upfront.
  const { bundleIdentifier } = await prompt(
    {
      type: 'text',
      name: 'bundleIdentifier',
      initial: recommendedBundleId,
      // The Apple helps people know this isn't an EAS feature.
      message: `What would you like your iOS bundle identifier to be?`,
      validate: validateBundleId,
    },
    {
      nonInteractiveHelp: noBundleIdMessage,
    }
  );

  // Warn the user if the bundle ID is already in use.
  const warning = await getBundleIdWarningAsync(bundleIdentifier);
  if (warning) {
    Log.newLine();
    Log.nestedWarn(warning);
    Log.newLine();
    if (
      !(await confirmAsync({
        message: `Continue?`,
        initial: true,
      }))
    ) {
      Log.newLine();
      return getOrPromptForBundleIdentifier(projectRoot);
    }
  }

  // Apply the changes to the config.
  await attemptModification(
    projectRoot,
    {
      ios: { ...(exp.ios || {}), bundleIdentifier },
    },
    { ios: { bundleIdentifier } }
  );

  return bundleIdentifier;
}

export async function getOrPromptForPackage(projectRoot: string): Promise<string> {
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });

  const currentPackage = exp.android?.package;
  if (currentPackage) {
    if (validatePackage(currentPackage)) {
      return currentPackage;
    }
    throw new CommandError(
      `Invalid format of Android package name. Only alphanumeric characters, '.' and '_' are allowed, and each '.' must be followed by a letter.`
    );
  }

  // Recommend a package name based on the username and project slug.
  let recommendedPackage: string | undefined;
  // Attempt to use the ios bundle id first since it's convenient to have them aligned.
  if (exp.ios?.bundleIdentifier && validatePackage(exp.ios.bundleIdentifier)) {
    recommendedPackage = exp.ios.bundleIdentifier;
  } else {
    const username = exp.owner ?? (await UserManager.getCurrentUsernameAsync());
    // It's common to use dashes in your node project name, strip them from the suggested package name.
    const possibleId = `com.${username}.${exp.slug}`.split('-').join('');
    if (username && validatePackage(possibleId)) {
      recommendedPackage = possibleId;
    }
  }

  Log.addNewLineIfNone();
  Log.log(
    `${Log.chalk.bold(`📝  Android package`)} ${Log.chalk.dim(
      learnMore('https://expo.fyi/android-package')
    )}`
  );
  Log.newLine();

  // Prompt the user for the android package.
  // Even if the project is using a dynamic config we can still
  // prompt a better error message, recommend a default value, and help the user
  // validate their custom android package upfront.
  const { packageName } = await prompt(
    {
      type: 'text',
      name: 'packageName',
      initial: recommendedPackage,
      message: `What would you like your Android package name to be?`,
      validate: validatePackage,
    },
    {
      nonInteractiveHelp: noPackageMessage,
    }
  );

  // Warn the user if the package name is already in use.
  const warning = await getPackageNameWarningAsync(packageName);
  if (warning) {
    Log.newLine();
    Log.nestedWarn(warning);
    Log.newLine();
    if (
      !(await confirmAsync({
        message: `Continue?`,
        initial: true,
      }))
    ) {
      Log.newLine();
      return getOrPromptForPackage(projectRoot);
    }
  }

  // Apply the changes to the config.
  await attemptModification(
    projectRoot,
    {
      android: { ...(exp.android || {}), package: packageName },
    },
    {
      android: { package: packageName },
    }
  );

  return packageName;
}

async function attemptModification(
  projectRoot: string,
  edits: Partial<ExpoConfig>,
  exactEdits: Partial<ExpoConfig>
): Promise<void> {
  const modification = await modifyConfigAsync(projectRoot, edits, {
    skipSDKVersionRequirement: true,
  });
  if (modification.type === 'success') {
    Log.newLine();
  } else {
    warnAboutConfigAndThrow(modification.type, modification.message!, exactEdits);
  }
}

function logNoConfig() {
  Log.log(
    Log.chalk.yellow(
      'No Expo config was found. Please create an Expo config (`app.config.js` or `app.json`) in your project root.'
    )
  );
}

function warnAboutConfigAndThrow(type: string, message: string, edits: Partial<ExpoConfig>) {
  Log.addNewLineIfNone();
  if (type === 'warn') {
    // The project is using a dynamic config, give the user a helpful log and bail out.
    Log.log(Log.chalk.yellow(message));
  } else {
    logNoConfig();
  }

  notifyAboutManualConfigEdits(edits);
  throw new SilentError();
}

function notifyAboutManualConfigEdits(edits: Partial<ExpoConfig>) {
  Log.log(Log.chalk.cyan(`Please add the following to your Expo config, and try again... `));
  Log.newLine();
  Log.log(JSON.stringify(edits, null, 2));
  Log.newLine();
}
