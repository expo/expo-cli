import { ExpoConfig, getConfig, modifyConfigAsync } from '@expo/config';
import { UserManager } from '@expo/xdl';
import got from 'got';

import CommandError, { SilentError } from '../../CommandError';
import log from '../../log';
import prompt, { confirmAsync } from '../../prompts';
import { learnMore } from '../utils/TerminalLink';
import { isUrlAvailableAsync } from '../utils/url';

const noIOSBundleIdMessage = `Your project must have a \`ios.bundleIdentifier\` set in the Expo config (app.json or app.config.js).\nSee https://expo.fyi/bundle-identifier`;
const noAndroidPackageMessage = `Your project must have a \`android.package\` set in the Expo config (app.json or app.config.js).\nSee https://expo.fyi/android-package`;
const noAndroidApplicationIdMessage = `Your project must have a \`android.applicationId\` set in the Expo config (app.json or app.config.js).\nSee https://expo.fyi/android-application-id`;

/**
 * Checks whether the given `iOSBundleId` has the correct format.
 * @throws When the provided value has incorrect format.
 */
function isIOSBundleIdValid(iOSBundleId?: string): boolean {
  if (!iOSBundleId) {
    return false;
  }
  return /^[a-zA-Z][a-zA-Z0-9\-.]+$/.test(iOSBundleId);
}

/**
 * Checks whether the given `androidPackageName` has the correct format.
 * Android package name is just a dot-separated string of Java identifiers.
 * @warning Kotlin accepts slightly different package names that is not supported here.
 * @see https://docs.oracle.com/javase/tutorial/java/nutsandbolts/variables.html
 * @see https://docs.oracle.com/javase/tutorial/java/package/namingpkgs.html
 */
function isAndroidPackageNameValid(androidPackageName?: string): boolean {
  if (!androidPackageName) {
    return false;
  }
  return /(?!(?:^|.*\.)(?:abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|extends|false|final|finally|float|for|goto|if|implements|import|import|instanceof|interface|long|native|new|null|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|true|try|void|volatile|volatile|while)(?:\.|$))(^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$)/.test(
    androidPackageName
  );
}

/**
 * Checks whether the given `androidApplicationId` has the correct format.
 * Android application ID follows the Java package naming rules, but it's stricter.
 * @see https://developer.android.com/studio/build/application-id
 */
function isAndroidApplicationIdValid(androidApplicationId?: string): boolean {
  if (!androidApplicationId) {
    return false;
  }
  return /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(androidApplicationId);
}

const cachedIOSBundleIdResults: Record<string, string> = {};
const cachedAndroidApplicationIdResults: Record<string, string> = {};

/**
 * A quality of life method that provides a warning when the bundle ID is already in use.
 */
async function getIOSBundleIdWarningAsync(iOSBundleId: string): Promise<string | null> {
  // Prevent fetching for the same ID multiple times.
  if (cachedIOSBundleIdResults[iOSBundleId]) {
    return cachedIOSBundleIdResults[iOSBundleId];
  }

  if (!(await isUrlAvailableAsync('itunes.apple.com'))) {
    // If no network, simply skip the warnings since they'll just lead to more confusion.
    return null;
  }

  const url = `http://itunes.apple.com/lookup?bundleId=${iOSBundleId}`;
  try {
    const response = await got(url);
    const json = JSON.parse(response.body?.trim());
    if (json.resultCount > 0) {
      const firstApp = json.results[0];
      const message = formatInUseWarning(firstApp.trackName, firstApp.sellerName, iOSBundleId);
      cachedIOSBundleIdResults[iOSBundleId] = message;
      return message;
    }
  } catch {
    // Error fetching itunes data.
  }
  return null;
}

async function getAndroidApplicationIdWarningAsync(
  androidApplicationId: string
): Promise<string | null> {
  // Prevent fetching for the same ID multiple times.
  if (cachedAndroidApplicationIdResults[androidApplicationId]) {
    return cachedAndroidApplicationIdResults[androidApplicationId];
  }

  if (!(await isUrlAvailableAsync('play.google.com'))) {
    // If no network, simply skip the warnings since they'll just lead to more confusion.
    return null;
  }

  const url = `https://play.google.com/store/apps/details?id=${androidApplicationId}`;
  try {
    const response = await got(url);
    // If the page exists, then warn the user.
    if (response.statusCode === 200) {
      // There is no JSON API for the Play Store so we can't concisely
      // locate the app name and developer to match the iOS warning.
      const message = `⚠️  The application ID ${log.chalk.bold(
        androidApplicationId
      )} is already in use. ${log.chalk.dim(learnMore(url))}`;
      cachedAndroidApplicationIdResults[androidApplicationId] = message;
      return message;
    }
  } catch {
    // Error fetching play store data or the page doesn't exist.
  }
  return null;
}

function formatInUseWarning(appName: string, author: string, id: string): string {
  return `⚠️  The app ${log.chalk.bold(appName)} by ${log.chalk.italic(
    author
  )} is already using ${log.chalk.bold(id)}`;
}

/**
 * Tries to read `ios.bundleIdentifier` from the application manifest.
 * It tries to obtain the value according to the following rules:
 * 1. read `ios.bundleIdentifier` and return it if present (throws upon wrong format) or upon no value 🔽
 * 2. read `android.applicationId` and use it as a suggestion for the user or upon no value 🔽
 * 3. read `android.package` and use it as a suggestion for the user or upon no value 🔽
 * 4. create `username`-based value and use it as a suggestion for the user.
 *
 * @sideEffect If there was not `ios.bundleIdentifier` in the manifest then the manifest is mutated with the user input.
 * @throws When there is a value in `ios.bundleIdentifier`, but the format of this value is incorrect.
 */
export async function getOrPromptForIOSBundleIdentifier(projectRoot: string): Promise<string> {
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });

  const currentValue = validateValue(
    exp.ios?.bundleIdentifier,
    isIOSBundleIdValid,
    `The ios.bundleIdentifier defined in your Expo config is not formatted properly. Only alphanumeric characters, '.', '-', and '_' are allowed, and each '.' must be followed by a letter.`
  );
  if (currentValue) {
    return currentValue;
  }

  const recommendedValue = await getRecommendedValue(
    /* eslint-disable prettier/prettier */
    [exp.android?.applicationId, exp.android?.package, await generateUsernameBasedId(exp)],
    /* eslint-enable prettier/prettier */
    isIOSBundleIdValid
  );

  // Prompt the user for the bundle ID.
  // Even if the project is using a dynamic config we can still
  // prompt a better error message, recommend a default value, and help the user
  // validate their custom bundle ID upfront.
  const bundleIdentifier = await promptForValue({
    prePromptMessage: {
      text: `📝  iOS Bundle Identifier`,
      link: 'https://expo.fyi/bundle-identifier',
    },
    initial: recommendedValue,
    // The Apple helps people know this isn't an EAS feature.
    message: `What would you like your iOS bundle identifier to be?`,
    validate: isIOSBundleIdValid,
    nonInteractiveHelp: noIOSBundleIdMessage,
  });

  // Warn the user if the bundle ID is already in use.
  if (await shouldRepeatUnlessAvailable(() => getIOSBundleIdWarningAsync(bundleIdentifier))) {
    return getOrPromptForIOSBundleIdentifier(projectRoot);
  }

  // Apply the changes to the config.
  await attemptModification(
    projectRoot,
    { ios: { ...exp.ios, bundleIdentifier } },
    { ios: { bundleIdentifier } }
  );

  return bundleIdentifier;
}

/**
 * Tries to read `android.package` from the application manifest.
 * It tries to obtain the value according to the following rules:
 * 1. read `android.package` and return it if present (throws upon wrong format) or upon no value 🔽
 * 2. read `android.applicationId` and use it as a suggestion for the user or upon no value 🔽
 * 3. read `ios.bundleIdentifier` and use it as a suggestion for the user or upon no value 🔽
 * 4. create `username`-based value and use it as a suggestion for the user.
 *
 * @sideEffect If there was not `android.package` in the manifest then the manifest is mutated with the user input.
 * @throws When there is a value in `android.package`, but the format of the this value is incorrect.
 */
export async function getOrPromptForAndroidPackageName(projectRoot: string): Promise<string> {
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });

  const validate = isAndroidPackageNameValid;

  const currentValue = validateValue(
    exp.android?.package,
    validate,
    `The android.package defined in your Expo config is not formatted properly. Only alphanumeric characters, '.', '$' and '_' are allowed. No Java keyword or reserved word can be used as a single part of the package name.`
  );
  if (currentValue) {
    return currentValue;
  }

  const recommendedValue = await getRecommendedValue(
    /* eslint-disable prettier/prettier */
    [
      exp.android?.applicationId,
      exp.ios?.bundleIdentifier,
      await generateUsernameBasedId(exp, true),
    ],
    /* eslint-enable prettier/prettier */
    validate
  );

  // Prompt the user for the android package.
  // Even if the project is using a dynamic config we can still
  // prompt a better error message, recommend a default value, and help the user
  // validate their custom android package upfront.
  const packageName = await promptForValue({
    prePromptMessage: {
      text: `📝  Android package`,
      link: 'https://expo.fyi/android-package',
    },
    initial: recommendedValue,
    message: `What would you like your Android package name to be?`,
    validate,
    nonInteractiveHelp: noAndroidPackageMessage,
  });

  // Apply the changes to the config.
  await attemptModification(
    projectRoot,
    { android: { ...exp.android, package: packageName } },
    { android: { package: packageName } }
  );

  return packageName;
}

/**
 * Tries to read `android.applicationId` from the application manifest.
 * It tries to obtain the value according to the following rules:
 * 1. read `android.applicationId` and return it if present (throws upon wrong format) or upon no value 🔽
 * 2. read `android.package` and use it as a suggestion for the user or upon no value 🔽
 * 3. read `ios.bundleIdentifier` and use it as a suggestion for the user or upon no value 🔽
 * 4. create `username`-based value and use it as a suggestion for the user.
 *
 * @sideEffect If there was not `android.applicationId` in the manifest then the manifest is mutated with the user input.
 * @throws When there is a value in `android.applicationId`, but the format of the this value is incorrect.
 */
export async function getOrPromptForAndroidApplicationId(projectRoot: string): Promise<string> {
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });

  const validate = isAndroidApplicationIdValid;

  const currentValue = validateValue(
    exp.android?.applicationId,
    validate,
    `The android.applicationId defined in your Expo config is not formatted properly. Only alphanumeric characters, '.' and '_' are allowed, and each '.' must be followed by a letter.`
  );
  if (currentValue) {
    return currentValue;
  }

  const recommendedValue = await getRecommendedValue(
    /* eslint-disable prettier/prettier */
    [exp.android?.package, exp.ios?.bundleIdentifier, await generateUsernameBasedId(exp, true)],
    /* eslint-enable prettier/prettier */
    validate
  );

  // Prompt the user for the final value.
  // Even if the project is using a dynamic config we can still
  // prompt a better error message, recommend a default value, and help the user
  // validate their custom application ID upfront.
  const applicationId = await promptForValue({
    prePromptMessage: {
      text: `TODO`,
      link: 'https://expo.fyi/android-application-id',
    },
    initial: recommendedValue,
    message: `What would you like your Android application ID to be?`,
    validate,
    nonInteractiveHelp: noAndroidApplicationIdMessage,
  });

  // Warn the user if the application ID is already in use.
  if (await shouldRepeatUnlessAvailable(() => getAndroidApplicationIdWarningAsync(applicationId))) {
    return getOrPromptForAndroidApplicationId(projectRoot);
  }

  // Apply the changes to the config.
  await attemptModification(
    projectRoot,
    { android: { ...exp.android, applicationId } },
    { android: { applicationId } }
  );

  return applicationId;
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
    warnAboutConfigAndThrow(modification.type, modification.message!, exactEdits);
  }
}

function logNoConfig() {
  log(
    log.chalk.yellow(
      'No Expo config was found. Please create an Expo config (`app.config.js` or `app.json`) in your project root.'
    )
  );
}

function warnAboutConfigAndThrow(type: string, message: string, edits: Partial<ExpoConfig>) {
  log.addNewLineIfNone();
  if (type === 'warn') {
    // The project is using a dynamic config, give the user a helpful log and bail out.
    log(log.chalk.yellow(message));
  } else {
    logNoConfig();
  }

  notifyAboutManualConfigEdits(edits);
  throw new SilentError();
}

function notifyAboutManualConfigEdits(edits: Partial<ExpoConfig>) {
  log(log.chalk.cyan(`Please add the following to your Expo config, and try again... `));
  log.newLine();
  log(JSON.stringify(edits, null, 2));
  log.newLine();
}

/**
 * Prompt the user for the the id.
 * It suggest the id basing on `initial` value.
 */
async function promptForValue({
  prePromptMessage: { text, link },
  initial,
  message,
  validate,
  nonInteractiveHelp,
}: {
  prePromptMessage: {
    text: string;
    link: string;
  };
  initial: string | undefined;
  message: string;
  validate: (value: string | undefined) => boolean;
  nonInteractiveHelp: string;
}): Promise<string> {
  log.addNewLineIfNone();
  log(`${log.chalk.bold(text)} ${log.chalk.dim(learnMore(link))}`);
  log.newLine();
  const { input } = await prompt(
    {
      type: 'text',
      name: 'input',
      initial,
      message,
      validate,
    },
    {
      nonInteractiveHelp,
    }
  );
  return input;
}

/**
 * Invokes the availability check and if there's a warning prompts the user about repeating the process.
 * When checked resource is not available, the user is prompted about possible repetition of the process.
 * @param availabilityChecker Function returning string with a warning due to unavailability.
 * @returns `true` if the user decided about repeating the process upon unavailability of the resource, `false` otherwise or when the resource is available.
 */
async function shouldRepeatUnlessAvailable(
  availabilityChecker: () => Promise<string | null>
): Promise<boolean> {
  const warning = await availabilityChecker();
  if (warning) {
    log.newLine();
    log.nestedWarn(warning);
    log.newLine();
    if (
      !(await confirmAsync({
        message: `Continue?`,
        initial: true,
      }))
    ) {
      log.newLine();
      return true;
    }
  }
  return false;
}

/**
 * If there's a value, uses `validator` function to check it's format.
 * If the format mismatch an error with `errorMessage` is thrown.
 */
function validateValue(
  value: string | undefined,
  validator: (value?: string) => boolean,
  errorMessage: string
): string | undefined {
  if (!value) {
    return;
  }
  if (!validator(value)) {
    throw new CommandError(errorMessage);
  }
  return value;
}

/**
 * Iterate over `possibleValuesOrAccessors` and find the first element that satisfies `validator`
 * @param possibleValues
 * @param validator
 */
async function getRecommendedValue(
  possibleValues: (string | undefined)[],
  validator: (value?: string) => boolean
): Promise<string | undefined> {
  const value = possibleValues.find(validator);
  return value;
}

/**
 * Basing on username and project slug the possible id is generated.
 * @param replaceHyphensWithUnderscores On Android `-` is not a valid character, so it can be replaced with `_`.
 */
async function generateUsernameBasedId(
  exp: ExpoConfig,
  replaceHyphensWithUnderscores: boolean = false
): Promise<string | undefined> {
  const username = exp.owner ?? (await UserManager.getCurrentUsernameAsync()) ?? undefined;
  if (!username) {
    return;
  }
  if (replaceHyphensWithUnderscores) {
    return `com.${username.replace('-', '_')}.${exp.slug.replace('-', '_')}`;
  }
  return `com.${username}.${exp.slug}`;
}
