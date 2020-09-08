import { ExpoConfig, getConfig, modifyConfigAsync } from '@expo/config';
import { UserManager } from '@expo/xdl';

import log from '../../log';
import prompt from '../../prompt';
import { learnMore } from '../utils/TerminalLink';

const noBundleIdMessage = `Your project must have a \`bundleIdentifier\` set in the Expo config (app.json or app.config.js).\nSee https://expo.fyi/bundle-identifier`;
const noPackageMessage = `Your project must have a \`package\` set in the Expo config (app.json or app.config.js).\nSee https://expo.fyi/android-package`;

function validateBundleId(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9\-.]+$/.test(value);
}

function validatePackage(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(value);
}

export async function getOrPromptForBundleIdentifier(projectRoot: string): Promise<string> {
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });

  const currentBundleId = exp.ios?.bundleIdentifier;
  if (currentBundleId) {
    if (validateBundleId(currentBundleId)) {
      return currentBundleId;
    }

    log(
      log.chalk.red(
        `The ios.bundleIdentifier defined in your Expo config is not formatted properly. Only alphanumeric characters, '.', '-', and '_' are allowed, and each '.' must be followed by a letter.`
      )
    );

    process.exit(1);
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

  log.addNewLineIfNone();
  log(
    `${log.chalk.bold(`📝 iOS Bundle Identifier`)} ${log.chalk.dim(
      learnMore('https://expo.fyi/bundle-identifier')
    )}`
  );
  log.newLine();
  // Prompt the user for the bundle ID.
  // Even if the project is using a dynamic config we can still
  // prompt a better error message, recommend a default value, and help the user
  // validate their custom bundle ID upfront.
  const { bundleIdentifier } = await prompt(
    [
      {
        name: 'bundleIdentifier',
        default: recommendedBundleId,
        // The Apple helps people know this isn't an EAS feature.
        message: `What would you like your iOS bundle identifier to be?`,
        validate: validateBundleId,
      },
    ],
    {
      nonInteractiveHelp: noBundleIdMessage,
    }
  );

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
    log(
      log.chalk.red(
        `Invalid format of Android package name. Only alphanumeric characters, '.' and '_' are allowed, and each '.' must be followed by a letter.`
      )
    );

    process.exit(1);
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

  log.addNewLineIfNone();
  log(
    `${log.chalk.bold(`📝 Android package`)} ${log.chalk.dim(
      learnMore('https://expo.fyi/android-package')
    )}`
  );
  log.newLine();

  // Prompt the user for the android package.
  // Even if the project is using a dynamic config we can still
  // prompt a better error message, recommend a default value, and help the user
  // validate their custom android package upfront.
  const { packageName } = await prompt(
    [
      {
        name: 'packageName',
        default: recommendedPackage,
        message: `What would you like your Android package name to be?`,
        validate: validatePackage,
      },
    ],
    {
      nonInteractiveHelp: noPackageMessage,
    }
  );

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
    log.newLine();
  } else {
    warnAboutConfigAndExit(modification.type, modification.message!, exactEdits);
  }
}

function logNoConfig() {
  log(
    log.chalk.yellow(
      'No Expo config was found. Please create an Expo config (`app.config.js` or `app.json`) in your project root.'
    )
  );
}

function warnAboutConfigAndExit(type: string, message: string, edits: Partial<ExpoConfig>) {
  log.addNewLineIfNone();
  if (type === 'warn') {
    // The project is using a dynamic config, give the user a helpful log and bail out.
    log(log.chalk.yellow(message));
  } else {
    logNoConfig();
  }

  notifyAboutManualConfigEdits(edits);
  process.exit(1);
}

function notifyAboutManualConfigEdits(edits: Partial<ExpoConfig>) {
  log(log.chalk.cyan(`Please add the following to your Expo config, and try again... `));
  log.newLine();
  log(JSON.stringify(edits, null, 2));
  log.newLine();
}
