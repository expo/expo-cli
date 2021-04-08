import { configFilename, ExpoConfig, getConfig, PackageJSONConfig } from '@expo/config';
import Schemer, { SchemerError, ValidationError } from '@expo/schemer';
import spawnAsync from '@expo/spawn-async';
import { execSync } from 'child_process';
import getenv from 'getenv';
import isReachable from 'is-reachable';
import resolveFrom from 'resolve-from';
import semver from 'semver';

import { Config, ExpSchema, ProjectUtils, Versions, Watchman } from '../internal';
import { learnMore } from '../logs/TerminalLink';

export const NO_ISSUES = 0;
export const WARNING = 1;
export const ERROR = 2;
export const FATAL = 3;

const MIN_WATCHMAN_VERSION = '4.6.0';
const MIN_NPM_VERSION = '3.0.0';
const CORRECT_NPM_VERSION = 'latest';
const WARN_NPM_VERSION_RANGES = ['>= 5.0.0 < 5.7.0'];
const BAD_NPM_VERSION_RANGES = ['>= 5.0.0 <= 5.0.3'];

const EXPO_NO_DOCTOR = getenv.boolish('EXPO_NO_DOCTOR', false);

function _isNpmVersionWithinRanges(npmVersion: string, ranges: string[]) {
  return ranges.some(range => semver.satisfies(npmVersion, range));
}

async function _checkNpmVersionAsync(projectRoot: string) {
  try {
    try {
      const yarnVersionResponse = await spawnAsync('yarnpkg', ['--version']);
      if (yarnVersionResponse.status === 0) {
        return NO_ISSUES;
      }
    } catch (e) {}

    const npmVersion = execSync('npm --version', { stdio: 'pipe' }).toString().trim();

    if (
      semver.lt(npmVersion, MIN_NPM_VERSION) ||
      _isNpmVersionWithinRanges(npmVersion, BAD_NPM_VERSION_RANGES)
    ) {
      ProjectUtils.logError(
        projectRoot,
        'expo',
        `Error: You are using npm version ${npmVersion}. We recommend the latest version ${CORRECT_NPM_VERSION}. To install it, run 'npm i -g npm@${CORRECT_NPM_VERSION}'.`,
        'doctor-npm-version'
      );
      return WARNING;
    } else if (_isNpmVersionWithinRanges(npmVersion, WARN_NPM_VERSION_RANGES)) {
      ProjectUtils.logWarning(
        projectRoot,
        'expo',
        `Warning: You are using npm version ${npmVersion}. There may be bugs in this version, use it at your own risk. We recommend version ${CORRECT_NPM_VERSION}.`,
        'doctor-npm-version'
      );
    } else {
      ProjectUtils.clearNotification(projectRoot, 'doctor-npm-version');
    }
  } catch (e) {
    ProjectUtils.logWarning(
      projectRoot,
      'expo',
      `Warning: Could not determine npm version. Make sure your version is >= ${MIN_NPM_VERSION} - we recommend ${CORRECT_NPM_VERSION}.`,
      'doctor-npm-version'
    );
    return WARNING;
  }

  return NO_ISSUES;
}

async function _checkWatchmanVersionAsync(projectRoot: string) {
  // There's no point in checking any of this stuff if watchman isn't supported on this platform
  if (!Watchman.isPlatformSupported()) {
    ProjectUtils.clearNotification(projectRoot, 'doctor-watchman-version');
    return;
  }

  const watchmanVersion = await Watchman.unblockAndGetVersionAsync(projectRoot);

  // If we can't get the watchman version, `getVersionAsync` will return `null`
  if (!watchmanVersion) {
    // watchman is probably just not installed
    ProjectUtils.clearNotification(projectRoot, 'doctor-watchman-version');
    return;
  }

  if (semver.lt(watchmanVersion, MIN_WATCHMAN_VERSION)) {
    let warningMessage = `Warning: You are using an old version of watchman (v${watchmanVersion}). This may cause problems for you.\n\nWe recommend that you either uninstall watchman (and XDE will try to use a copy it is bundled with) or upgrade watchman to a newer version, at least v${MIN_WATCHMAN_VERSION}.`;

    // Add a note about homebrew if the user is on a Mac
    if (process.platform === 'darwin') {
      warningMessage += `\n\nIf you are using homebrew, try:\nbrew uninstall watchman; brew install watchman`;
    }
    ProjectUtils.logWarning(projectRoot, 'expo', warningMessage, 'doctor-watchman-version');
  } else {
    ProjectUtils.clearNotification(projectRoot, 'doctor-watchman-version');
  }
}

async function validateWithSchema(
  projectRoot: string,
  {
    // Extract internal from the config object.
    _internal,
    ...exp
  }: ExpoConfig,
  schema: any,
  configName: string,
  validateAssets: boolean
): Promise<{ schemaErrorMessage: string | undefined; assetsErrorMessage: string | undefined }> {
  let schemaErrorMessage;
  let assetsErrorMessage;
  const validator = new Schemer(schema, { rootDir: projectRoot });

  // Validate the schema itself
  try {
    await validator.validateSchemaAsync(exp);
  } catch (e) {
    if (e instanceof SchemerError) {
      schemaErrorMessage = `Error: Problem${
        e.errors.length > 1 ? 's' : ''
      } validating fields in ${configName}. ${learnMore(
        'https://docs.expo.io/workflow/configuration/'
      )}`;
      schemaErrorMessage += e.errors.map(formatValidationError).join('');
    }
  }

  if (validateAssets) {
    try {
      await validator.validateAssetsAsync(exp);
    } catch (e) {
      if (e instanceof SchemerError) {
        assetsErrorMessage = `Error: Problem${
          e.errors.length > 1 ? '' : 's'
        } validating asset fields in ${configName}. ${learnMore('https://docs.expo.io/')}`;
        assetsErrorMessage += e.errors.map(formatValidationError).join('');
      }
    }
  }
  return { schemaErrorMessage, assetsErrorMessage };
}

function formatValidationError(validationError: ValidationError) {
  return `\n • ${validationError.fieldPath ? 'Field: ' + validationError.fieldPath + ' - ' : ''}${
    validationError.message
  }.`;
}

async function _validateExpJsonAsync(
  exp: ExpoConfig,
  pkg: PackageJSONConfig,
  projectRoot: string,
  allowNetwork: boolean,
  skipSDKVersionRequirement: boolean | undefined
): Promise<number> {
  if (!exp || !pkg) {
    // getConfig already logged an error
    return FATAL;
  }

  try {
    await _checkWatchmanVersionAsync(projectRoot);
  } catch (e) {
    ProjectUtils.logWarning(
      projectRoot,
      'expo',
      `Warning: Problem checking watchman version. ${e.message}.`,
      'doctor-problem-checking-watchman-version'
    );
  }
  ProjectUtils.clearNotification(projectRoot, 'doctor-problem-checking-watchman-version');

  const sdkVersion = exp.sdkVersion;
  const configName = configFilename(projectRoot);

  // Warn if sdkVersion is UNVERSIONED
  if (sdkVersion === 'UNVERSIONED' && !process.env.EXPO_SKIP_MANIFEST_VALIDATION_TOKEN) {
    ProjectUtils.logError(
      projectRoot,
      'expo',
      `Error: Using unversioned Expo SDK. Do not publish until you set sdkVersion in ${configName}`,
      'doctor-unversioned'
    );
    return ERROR;
  }
  ProjectUtils.clearNotification(projectRoot, 'doctor-unversioned');
  const sdkVersions = await Versions.sdkVersionsAsync();
  if (!sdkVersions) {
    ProjectUtils.logError(
      projectRoot,
      'expo',
      `Error: Couldn't connect to SDK versions server`,
      'doctor-versions-endpoint-failed'
    );
    return ERROR;
  }
  ProjectUtils.clearNotification(projectRoot, 'doctor-versions-endpoint-failed');

  if (!skipSDKVersionRequirement && (!sdkVersion || !sdkVersions[sdkVersion])) {
    ProjectUtils.logError(
      projectRoot,
      'expo',
      `Error: Invalid sdkVersion. Valid options are ${Object.keys(sdkVersions).join(', ')}`,
      'doctor-invalid-sdk-version'
    );
    return ERROR;
  }
  ProjectUtils.clearNotification(projectRoot, 'doctor-invalid-sdk-version');

  // Skip validation if the correct token is set in env
  if (sdkVersion && sdkVersion !== 'UNVERSIONED') {
    try {
      const schema = await ExpSchema.getSchemaAsync(sdkVersion);
      const { schemaErrorMessage, assetsErrorMessage } = await validateWithSchema(
        projectRoot,
        exp,
        schema,
        configName,
        allowNetwork
      );

      if (schemaErrorMessage) {
        ProjectUtils.logError(projectRoot, 'expo', schemaErrorMessage, 'doctor-schema-validation');
      } else {
        ProjectUtils.clearNotification(projectRoot, 'doctor-schema-validation');
      }
      if (assetsErrorMessage) {
        ProjectUtils.logError(
          projectRoot,
          'expo',
          assetsErrorMessage,
          `doctor-validate-asset-fields`
        );
      } else {
        ProjectUtils.clearNotification(projectRoot, `doctor-validate-asset-fields`);
      }
      ProjectUtils.clearNotification(projectRoot, 'doctor-schema-validation-exception');
      if (schemaErrorMessage || assetsErrorMessage) return ERROR;
    } catch (e) {
      ProjectUtils.logWarning(
        projectRoot,
        'expo',
        `Warning: Problem validating ${configName}: ${e.message}.`,
        'doctor-schema-validation-exception'
      );
    }
  }

  if (sdkVersion) {
    const reactNativeIssue = await _validateReactNativeVersionAsync(
      exp,
      pkg,
      projectRoot,
      sdkVersions,
      sdkVersion
    );

    if (reactNativeIssue !== NO_ISSUES) {
      return reactNativeIssue;
    }
  }

  // TODO: Check any native module versions here

  return NO_ISSUES;
}

async function _validateReactNativeVersionAsync(
  exp: ExpoConfig,
  pkg: PackageJSONConfig,
  projectRoot: string,
  sdkVersions: Versions.SDKVersions,
  sdkVersion: string
): Promise<number> {
  let reactNative = null;

  if (pkg.dependencies?.['react-native']) {
    reactNative = pkg.dependencies['react-native'];
  } else if (pkg.devDependencies?.['react-native']) {
    reactNative = pkg.devDependencies['react-native'];
  } else if (pkg.peerDependencies?.['react-native']) {
    reactNative = pkg.peerDependencies['react-native'];
  }

  // react-native is required
  if (!reactNative) {
    ProjectUtils.logError(
      projectRoot,
      'expo',
      `Error: Can't find react-native in package.json dependencies`,
      'doctor-no-react-native-in-package-json'
    );
    return ERROR;
  }
  ProjectUtils.clearNotification(projectRoot, 'doctor-no-react-native-in-package-json');

  if (
    Versions.gteSdkVersion(exp, '41.0.0') &&
    pkg.dependencies?.['@react-native-community/async-storage']
  ) {
    ProjectUtils.logWarning(
      projectRoot,
      'expo',
      `@react-native-community/async-storage has been renamed. To upgrade:\n- remove @react-native-community/async-storage from package.json\n- run "expo install @react-native-async-storage/async-storage"\n- run "npx expo-codemod sdk41-async-storage src" to rename imports`,
      'doctor-legacy-async-storage'
    );
    return WARNING;
  } else {
    ProjectUtils.clearNotification(projectRoot, 'doctor-legacy-async-storage');
  }

  if (!exp.isDetached) {
    return NO_ISSUES;

    // (TODO-2017-07-20): Validate the react-native version if it uses
    // officially published package rather than Expo fork. Expo fork of
    // react-native was required before CRNA. We now only run the react-native
    // validation of the version if we are using the fork. We should probably
    // validate the version here as well such that it matches with the
    // react-native version compatible with the selected SDK.
  }

  // Expo fork of react-native is required
  if (!/expo\/react-native/.test(reactNative)) {
    ProjectUtils.logWarning(
      projectRoot,
      'expo',
      `Warning: Not using the Expo fork of react-native. ${learnMore('https://docs.expo.io/')}`,
      'doctor-not-using-expo-fork'
    );
    return WARNING;
  }
  ProjectUtils.clearNotification(projectRoot, 'doctor-not-using-expo-fork');

  try {
    const reactNativeTag = reactNative.match(/sdk-\d+\.\d+\.\d+/)[0];
    const sdkVersionObject = sdkVersions[sdkVersion];

    // TODO: Want to be smarter about this. Maybe warn if there's a newer version.
    if (
      semver.major(Versions.parseSdkVersionFromTag(reactNativeTag)) !==
      semver.major(Versions.parseSdkVersionFromTag(sdkVersionObject['expoReactNativeTag']))
    ) {
      ProjectUtils.logWarning(
        projectRoot,
        'expo',
        `Warning: Invalid version of react-native for sdkVersion ${sdkVersion}. Use github:expo/react-native#${sdkVersionObject['expoReactNativeTag']}`,
        'doctor-invalid-version-of-react-native'
      );
      return WARNING;
    }
    ProjectUtils.clearNotification(projectRoot, 'doctor-invalid-version-of-react-native');

    ProjectUtils.clearNotification(projectRoot, 'doctor-malformed-version-of-react-native');
  } catch (e) {
    ProjectUtils.logWarning(
      projectRoot,
      'expo',
      `Warning: ${reactNative} is not a valid version. Version must be in the form of sdk-x.y.z. Please update your package.json file.`,
      'doctor-malformed-version-of-react-native'
    );
    return WARNING;
  }

  return NO_ISSUES;
}

async function _validateNodeModulesAsync(projectRoot: string): Promise<number> {
  // Check to make sure react-native is installed

  if (resolveFrom.silent(projectRoot, 'react-native/local-cli/cli.js')) {
    ProjectUtils.clearNotification(projectRoot, 'doctor-react-native-not-installed');
  } else {
    ProjectUtils.logError(
      projectRoot,
      'expo',
      `Error: react-native is not installed. Please run \`npm install\` or \`yarn\` in your project directory.`,
      'doctor-react-native-not-installed'
    );
    return FATAL;
  }
  return NO_ISSUES;
}

export async function validateWithoutNetworkAsync(
  projectRoot: string,
  options: { skipSDKVersionRequirement?: boolean } = {}
): Promise<number> {
  return validateAsync(projectRoot, false, options.skipSDKVersionRequirement);
}

export async function validateWithNetworkAsync(
  projectRoot: string,
  options: { skipSDKVersionRequirement?: boolean } = {}
): Promise<number> {
  return validateAsync(projectRoot, true, options.skipSDKVersionRequirement);
}

async function validateAsync(
  projectRoot: string,
  allowNetwork: boolean,
  skipSDKVersionRequirement: boolean | undefined
): Promise<number> {
  if (EXPO_NO_DOCTOR) {
    return NO_ISSUES;
  }

  const { exp, pkg } = getConfig(projectRoot, {
    strict: true,
    skipSDKVersionRequirement,
  });

  ProjectUtils.clearNotification(projectRoot, 'doctor-config-json-not-read');

  let status = await _checkNpmVersionAsync(projectRoot);
  if (status === FATAL) {
    return status;
  }

  const expStatus = await _validateExpJsonAsync(
    exp,
    pkg,
    projectRoot,
    allowNetwork,
    skipSDKVersionRequirement
  );
  if (expStatus === FATAL) {
    return expStatus;
  }

  status = Math.max(status, expStatus);

  const nodeModulesStatus = await _validateNodeModulesAsync(projectRoot);
  if (nodeModulesStatus > status) {
    return nodeModulesStatus;
  }

  return status;
}

export async function validateExpoServersAsync(projectRoot: string): Promise<number> {
  const domains = ['expo.io', 'expo.fyi', 'expo.dev', 'static.expo.dev', 'exp.host'];
  const attempts = await Promise.all(
    domains.map(async domain => ({
      domain,
      reachable: await isReachable(domain),
    }))
  );
  const failures = attempts.filter(attempt => !attempt.reachable);

  if (failures.length) {
    failures.forEach(failure => {
      ProjectUtils.logWarning(
        projectRoot,
        'expo',
        `Warning: could not reach \`${failure.domain}\`.`,
        `doctor-server-dashboard-not-reachable-${failure.domain}`
      );
    });
    console.log();
    ProjectUtils.logWarning(
      projectRoot,
      'expo',
      `We couldn't reach some of our domains, this might cause issues on our website or services.\nPlease check your network configuration and try to access these domains in your browser.`,
      'doctor-server-dashboard-not-reachable'
    );
    console.log();
    return WARNING;
  }
  return NO_ISSUES;
}
