/**
 * @flow
 */

import 'instapromise';

import _ from 'lodash';
import semver from 'semver';
import fs from 'fs';
import jsonschema from 'jsonschema';
import path from 'path';
import request from 'request';
import spawnAsync from '@expo/spawn-async';
import readChunk from 'read-chunk';
import fileType from 'file-type';

import * as ExpSchema from './ExpSchema';
import * as ProjectUtils from './ProjectUtils';
import Api from '../Api';
import * as Binaries from '../Binaries';
import Config from '../Config';
import * as Versions from '../Versions';
import * as Watchman from '../Watchman';

export const NO_ISSUES = 0;
export const WARNING = 1;
export const FATAL = 2;

const MIN_WATCHMAN_VERSION = '4.6.0';
const MIN_NPM_VERSION = '3.0.0';
const CORRECT_NPM_VERSION = '4.6.1';
const WARN_NPM_VERSION_RANGES = ['>= 5.0.0'];
const BAD_NPM_VERSION_RANGES = ['>= 5.0.0 <= 5.0.3'];

function _isNpmVersionWithinRanges(npmVersion, ranges) {
  return _.some(ranges, range => semver.satisfies(npmVersion, range));
}

async function _checkNpmVersionAsync(projectRoot) {
  try {
    await Binaries.sourceBashLoginScriptsAsync();
    let npmVersionResponse = await spawnAsync('npm', ['--version']);
    let npmVersion = _.trim(npmVersionResponse.stdout);
    if (
      semver.lt(npmVersion, MIN_NPM_VERSION) ||
      _isNpmVersionWithinRanges(npmVersion, BAD_NPM_VERSION_RANGES)
    ) {
      ProjectUtils.logError(
        projectRoot,
        'expo',
        `Error: You are using npm version ${npmVersion}. We recommend version ${CORRECT_NPM_VERSION}. To install it, run 'npm i -g npm@${CORRECT_NPM_VERSION}'.`,
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

async function _checkWatchmanVersionAsync(projectRoot) {
  // There's no point in checking any of this stuff if watchman isn't supported on this platform
  if (!Watchman.isPlatformSupported()) {
    ProjectUtils.clearNotification(projectRoot, 'doctor-watchman-version');
    return;
  }

  let watchmanVersion = await Watchman.unblockAndGetVersionAsync(projectRoot);

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
    ProjectUtils.logWarning(
      projectRoot,
      'expo',
      warningMessage,
      'doctor-watchman-version'
    );
  } else {
    ProjectUtils.clearNotification(projectRoot, 'doctor-watchman-version');
  }
}

export async function validateWithSchemaFileAsync(
  projectRoot: string,
  schemaPath: string
): Promise<{ errorMessage?: string }> {
  let { exp, pkg } = await ProjectUtils.readConfigJsonAsync(projectRoot);
  let schema = JSON.parse(await fs.readFile.promise(schemaPath, 'utf8'));
  return validateWithSchema(exp, schema.schema, 'exp.json', 'UNVERSIONED');
}

export function validateWithSchema(
  exp: any,
  schema: any,
  configName: string,
  sdkVersion: string
): { errorMessage?: string } {
  let validator = new jsonschema.Validator();
  let validationResult = validator.validate(exp, schema);

  let fullMessage;
  if (validationResult.errors && validationResult.errors.length > 0) {
    fullMessage = `Warning: Problem${validationResult.errors.length > 1
      ? 's'
      : ''} in ${configName}. See https://docs.expo.io/versions/v${sdkVersion}/guides/configuration.html.`;
    for (let error of validationResult.errors) {
      // Formate the message nicely
      let message = error.stack
        .replace(/instance\./g, '')
        .replace(/exists in instance/g, `exists in ${configName}`)
        .replace('instance additionalProperty', 'additional property');
      fullMessage += `\n  - ${message}.`;
    }
  }

  return { errorMessage: fullMessage };
}

async function _validateAssetFieldsAsync(projectRoot, exp) {
  try {
    const assetSchemas = await ExpSchema.getAssetSchemasAsync(exp.sdkVersion);
    await Promise.all(
      assetSchemas.map(
        async ({
          fieldPath,
          schema: { meta: { asset, contentTypePattern, contentTypeHuman } },
        }) => {
          const value = _.get(exp, fieldPath);
          if (asset && value) {
            if (contentTypePattern) {
              // NOTE(nikki): The '4100' below should be enough for most file types, though we
              //              could probably go shorter....
              //              http://www.garykessler.net/library/file_sigs.html
              const filePath = path.resolve(projectRoot, value);
              const contentType = fs.existsSync(filePath)
                ? fileType(await readChunk(filePath, 0, 4100)).mime
                : (await request.promise.head({ url: value })).headers[
                    'content-type'
                  ];
              if (!contentType.match(new RegExp(contentTypePattern))) {
                const configName = await ProjectUtils.configFilenameAsync(
                  projectRoot
                );
                ProjectUtils.logWarning(
                  projectRoot,
                  'expo',
                  `Warning: Problem in ${configName}. Field '${fieldPath}' should point to a ${contentTypeHuman}, but the file at '${value}' has type '${contentType}'. See ${Config.helpUrl}`,
                  `doctor-validate-asset-fields-${fieldPath}`
                );
              } else {
                ProjectUtils.clearNotification(
                  projectRoot,
                  `doctor-validate-asset-fields-${fieldPath}`
                );
              }
            }
          }
        }
      )
    );

    ProjectUtils.clearNotification(projectRoot, 'doctor-validate-asset-fields');
  } catch (e) {
    ProjectUtils.logWarning(
      projectRoot,
      'expon',
      `Warning: Problem validating asset fields: ${e.message}.`,
      'doctor-validate-asset-fields'
    );
  }
}

async function _validatePackageJsonAndExpJsonAsync(
  exp,
  pkg,
  projectRoot
): Promise<number> {
  if (!exp || !pkg) {
    // readConfigJsonAsync already logged an error
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
  ProjectUtils.clearNotification(
    projectRoot,
    'doctor-problem-checking-watchman-version'
  );

  const expJsonExists = await ProjectUtils.fileExistsAsync(
    path.join(projectRoot, 'exp.json')
  );
  const appJsonExists = await ProjectUtils.fileExistsAsync(
    path.join(projectRoot, 'app.json')
  );

  if (expJsonExists && appJsonExists) {
    ProjectUtils.logWarning(
      projectRoot,
      'expo',
      `Warning: Both app.json and exp.json exist in this directory. Only one should exist for a single project.`,
      'doctor-both-app-and-exp-json'
    );
    return WARNING;
  }
  ProjectUtils.clearNotification(projectRoot, 'doctor-both-app-and-exp-json');

  let sdkVersion = exp.sdkVersion;
  const configName = await ProjectUtils.configFilenameAsync(projectRoot);
  try {
    // TODO(perry) figure out a way to tell the schema validator whether this is exp.json or app.json
    let schema = await ExpSchema.getSchemaAsync(sdkVersion);
    let { errorMessage } = validateWithSchema(
      exp,
      schema,
      configName,
      sdkVersion
    );

    if (errorMessage) {
      ProjectUtils.logWarning(
        projectRoot,
        'expo',
        errorMessage,
        'doctor-schema-validation'
      );
      return WARNING;
    } else {
      ProjectUtils.clearNotification(projectRoot, 'doctor-schema-validation');
    }

    ProjectUtils.clearNotification(
      projectRoot,
      'doctor-schema-validation-exception'
    );
  } catch (e) {
    ProjectUtils.logWarning(
      projectRoot,
      'expo',
      `Warning: Problem validating ${configName}: ${e.message}.`,
      'doctor-schema-validation-exception'
    );
  }

  // Warn if sdkVersion is UNVERSIONED
  if (sdkVersion === 'UNVERSIONED') {
    ProjectUtils.logWarning(
      projectRoot,
      'expo',
      `Warning: Using unversioned Expo SDK. Do not publish until you set sdkVersion in ${configName}`,
      'doctor-unversioned'
    );
    return WARNING;
  }
  ProjectUtils.clearNotification(projectRoot, 'doctor-unversioned');

  // react-native is required
  if (!pkg.dependencies || !pkg.dependencies['react-native']) {
    ProjectUtils.logWarning(
      projectRoot,
      'expo',
      `Warning: Can't find react-native in package.json dependencies`,
      'doctor-no-react-native-in-package-json'
    );
    return WARNING;
  }
  ProjectUtils.clearNotification(
    projectRoot,
    'doctor-no-react-native-in-package-json'
  );

  // TODO(adam) set up caching for this
  let sdkVersions = await Api.sdkVersionsAsync();
  if (!sdkVersions) {
    ProjectUtils.logWarning(
      projectRoot,
      'expo',
      `Warning: Couldn't connect to SDK versions server`,
      'doctor-versions-endpoint-failed'
    );
    return WARNING;
  }
  ProjectUtils.clearNotification(
    projectRoot,
    'doctor-versions-endpoint-failed'
  );

  if (!sdkVersions[sdkVersion]) {
    ProjectUtils.logWarning(
      projectRoot,
      'expo',
      `Warning: Invalid sdkVersion. Valid options are ${_.keys(
        sdkVersions
      ).join(', ')}`,
      'doctor-invalid-sdk-version'
    );
    return WARNING;
  }
  ProjectUtils.clearNotification(projectRoot, 'doctor-invalid-sdk-version');

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

  // TODO: Check any native module versions here

  return NO_ISSUES;
}

async function _validateReactNativeVersionAsync(
  exp,
  pkg,
  projectRoot,
  sdkVersions,
  sdkVersion
): Promise<number> {
  if (Config.validation.reactNativeVersionWarnings) {
    let reactNative = pkg.dependencies['react-native'];

    // TODO(2016-12-20): Remove the check for our old "exponentjs" org eventually
    if (!reactNative.match(/(exponent(?:js)?|expo)\/react-native/)) {
      return NO_ISSUES;

      // (TODO-2017-07-20): Validate the react-native version if it uses
      // officially published package rather than Expo fork. Expo fork of
      // react-native was required before CRNA. We now only run the react-native
      // validation of the version if we are using the fork. We should probably
      // validate the version here as well such that it matches with the
      // react-native version compatible with the selected SDK.
      //
      // ProjectUtils.logWarning(
      //   projectRoot,
      //   'expo',
      //   `Warning: Not using the Expo fork of react-native. See ${Config.helpUrl}.`,
      //   'doctor-not-using-expo-fork'
      // );
      // return WARNING;
    }
    ProjectUtils.clearNotification(projectRoot, 'doctor-not-using-expo-fork');

    try {
      let reactNativeTag = reactNative.match(/sdk-\d+\.\d+\.\d+/)[0];
      let sdkVersionObject = sdkVersions[sdkVersion];

      // TODO: Want to be smarter about this. Maybe warn if there's a newer version.
      if (
        semver.major(Versions.parseSdkVersionFromTag(reactNativeTag)) !==
        semver.major(
          Versions.parseSdkVersionFromTag(
            sdkVersionObject['expoReactNativeTag']
          )
        )
      ) {
        ProjectUtils.logWarning(
          projectRoot,
          'expo',
          `Warning: Invalid version of react-native for sdkVersion ${sdkVersion}. Use github:expo/react-native#${sdkVersionObject[
            'expoReactNativeTag'
          ]}`,
          'doctor-invalid-version-of-react-native'
        );
        return WARNING;
      }
      ProjectUtils.clearNotification(
        projectRoot,
        'doctor-invalid-version-of-react-native'
      );

      ProjectUtils.clearNotification(
        projectRoot,
        'doctor-malformed-version-of-react-native'
      );
    } catch (e) {
      ProjectUtils.logWarning(
        projectRoot,
        'expo',
        `Warning: ${reactNative} is not a valid version. Version must be in the form of sdk-x.y.z. Please update your package.json file.`,
        'doctor-malformed-version-of-react-native'
      );
      return WARNING;
    }
  }

  return NO_ISSUES;
}

// TODO: use `yarn check`
async function _validateNodeModulesAsync(projectRoot): Promise<number> {
  let { exp, pkg } = await ProjectUtils.readConfigJsonAsync(projectRoot);
  let nodeModulesPath = projectRoot;
  if (exp.nodeModulesPath) {
    nodeModulesPath = path.join(projectRoot, exp.nodeModulesPath);
  }

  // Check to make sure node_modules exists at all
  try {
    let result = fs.statSync(path.join(nodeModulesPath, 'node_modules'));
    if (!result.isDirectory()) {
      ProjectUtils.logError(
        projectRoot,
        'expo',
        `Error: node_modules directory is missing. Please run \`npm install\` in your project directory.`,
        'doctor-node-modules-missing'
      );
      return FATAL;
    }

    ProjectUtils.clearNotification(projectRoot, 'doctor-node-modules-missing');
  } catch (e) {
    ProjectUtils.logError(
      projectRoot,
      'expo',
      `Error: node_modules directory is missing. Please run \`npm install\` in your project directory.`,
      'doctor-node-modules-missing'
    );
    return FATAL;
  }

  // Check to make sure react native is installed
  try {
    let result = fs.statSync(
      path.join(
        nodeModulesPath,
        'node_modules',
        'react-native',
        'local-cli',
        'cli.js'
      )
    );
    if (!result.isFile()) {
      ProjectUtils.logError(
        projectRoot,
        'expo',
        `Error: React native is not installed. Please run \`npm install\` in your project directory.`,
        'doctor-react-native-not-installed'
      );
      return FATAL;
    }

    ProjectUtils.clearNotification(
      projectRoot,
      'doctor-react-native-not-installed'
    );
  } catch (e) {
    ProjectUtils.logError(
      projectRoot,
      'expo',
      `Error: React native is not installed. Please run \`npm install\` in your project directory.`,
      'doctor-react-native-not-installed'
    );
    return FATAL;
  }

  // Validate all package.json dependencies are installed and up to date
  if (pkg.dependencies) {
    await Binaries.sourceBashLoginScriptsAsync();

    try {
      await spawnAsync('npm', ['--version']);
    } catch (e) {
      ProjectUtils.logWarning(
        projectRoot,
        'expo',
        `\`npm\` command not found. If you have npm installed please run \`npm install -g exp && exp path\`.`,
        'doctor-npm-not-found'
      );
      return WARNING;
    }
    ProjectUtils.clearNotification(projectRoot, 'doctor-npm-not-found');

    let npmls;
    try {
      let npmlsCommand = await spawnAsync(
        'npm',
        ['ls', '--json', '--depth', '1'],
        {
          cwd: nodeModulesPath,
        }
      );
      npmls = npmlsCommand.stdout;
    } catch (e) {
      npmls = e.stdout; // `npm ls` sometimes returns an error code
    }

    if (!npmls) {
      ProjectUtils.logWarning(
        projectRoot,
        'expo',
        `Problem checking node_modules dependencies. Could not run \`npm ls\` in ${projectRoot}.`,
        'doctor-could-not-run-npm-ls'
      );
      return WARNING;
    }
    ProjectUtils.clearNotification(projectRoot, 'doctor-could-not-run-npm-ls');

    let npmlsDependencies;
    try {
      npmlsDependencies = JSON.parse(npmls).dependencies;
    } catch (e) {
      ProjectUtils.logWarning(
        projectRoot,
        'expo',
        `Problem checking node_modules dependencies: ${e.message}`,
        'doctor-problem-checking-node-modules'
      );
      return WARNING;
    }
    ProjectUtils.clearNotification(
      projectRoot,
      'doctor-problem-checking-node-modules'
    );

    if (npmlsDependencies) {
      let errorStrings = [];
      _.forEach(pkg.dependencies, (versionRequired, dependency) => {
        let installedDependency = npmlsDependencies[dependency];
        if (dependency === 'react' && versionRequired.match(/alpha/)) {
          // ignore alpha dependencies on react
        } else if (!installedDependency || !installedDependency.version) {
          if (installedDependency && installedDependency.peerMissing) {
            errorStrings.push(
              `Warning: '${dependency}' peer depencency missing. Run \`npm ls\` in ${nodeModulesPath} to see full warning.`
            );
          } else {
            errorStrings.push(
              `Warning: '${dependency}' dependency is not installed.`
            );
          }
        } else if (
          dependency !== 'react-native' &&
          !semver.satisfies(installedDependency.version, versionRequired) &&
          !versionRequired.includes(installedDependency.from)
        ) {
          // TODO: also check react-native
          // For react native, `from` field looks like "exponent/react-native#sdk-8.0.1" and
          // versionRequired looks like "github:exponent/react-native#sdk-8.0.0"
          errorStrings.push(
            `Warning: Installed version ${installedDependency.version} of '${dependency}' does not satisfy required version ${versionRequired}`
          );
        }
      });

      if (errorStrings.length > 0) {
        errorStrings.push(
          `\nIf there is an issue running your project, please run \`npm install\` in ${nodeModulesPath} and restart.`
        );
        ProjectUtils.logWarning(
          projectRoot,
          'expo',
          errorStrings.join('\n'),
          'doctor-node-modules-issues'
        );
        return WARNING;
      } else {
        ProjectUtils.clearNotification(
          projectRoot,
          'doctor-node-modules-issues'
        );
      }
    }
  }

  return NO_ISSUES;
}

export async function validateLowLatencyAsync(
  projectRoot: string
): Promise<number> {
  return validateAsync(projectRoot, false);
}

export async function validateWithNetworkAsync(
  projectRoot: string
): Promise<number> {
  return validateAsync(projectRoot, true);
}

async function validateAsync(
  projectRoot: string,
  allowNetwork: boolean
): Promise<number> {
  let { exp, pkg } = await ProjectUtils.readConfigJsonAsync(projectRoot);

  let status = await _checkNpmVersionAsync(projectRoot);
  if (status === FATAL) {
    return status;
  }

  let newStatus = await _validatePackageJsonAndExpJsonAsync(
    exp,
    pkg,
    projectRoot
  );
  if (newStatus > status) {
    status = newStatus;
  }

  // Don't block this! It has to make network requests so it's slow.
  if (allowNetwork) {
    _validateAssetFieldsAsync(projectRoot, exp);
  }

  // TODO: this broke once we started using yarn because `npm ls` doesn't
  // work on a yarn install. Use `yarn check` in the future.
  if (status !== FATAL && exp && !exp.ignoreNodeModulesValidation) {
    let nodeModulesStatus = await _validateNodeModulesAsync(projectRoot);
    if (nodeModulesStatus > status) {
      return nodeModulesStatus;
    }
  }

  return status;
}

export const EXPO_SDK_INSTALLED_AND_IMPORTED = 0;
export const EXPO_SDK_NOT_INSTALLED = 1;
export const EXPO_SDK_NOT_IMPORTED = 2;

export async function getExpoSdkStatus(projectRoot: string): Promise<number> {
  let { pkg } = await ProjectUtils.readConfigJsonAsync(projectRoot);

  try {
    let sdkPkg;
    if (pkg.dependencies['exponent']) {
      sdkPkg = 'exponent';
    } else if (pkg.dependencies['expo']) {
      sdkPkg = 'expo';
    } else {
      return EXPO_SDK_NOT_INSTALLED;
    }

    let mainFilePath = path.join(projectRoot, pkg.main);
    let mainFile = await fs.readFile.promise(mainFilePath, 'utf8');

    // TODO: support separate .ios.js and .android.js files
    if (
      mainFile.includes(`from '${sdkPkg}'`) ||
      mainFile.includes(`require('${sdkPkg}')`)
    ) {
      return EXPO_SDK_INSTALLED_AND_IMPORTED;
    } else {
      return EXPO_SDK_NOT_IMPORTED;
    }
  } catch (e) {
    return EXPO_SDK_NOT_IMPORTED;
  }
}
