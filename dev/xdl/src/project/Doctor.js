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
import spawnAsync from '@exponent/spawn-async';
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

async function _checkWatchmanVersionAsync(projectRoot) {
  // There's no point in checking any of this stuff if watchman isn't supported on this platform
  if (!Watchman.isPlatformSupported()) {
    return;
  }

  let watchmanVersion = await Watchman.unblockAndGetVersionAsync();

  // If we can't get the watchman version, `getVersionAsync` will return `null`
  if (!watchmanVersion) {
    // watchman is probably just not installed
    return;
  }

  if (semver.lt(watchmanVersion, MIN_WATCHMAN_VERSION)) {
    let warningMessage = `Warning: You are using an old version of watchman (v${watchmanVersion}). This may cause problems for you.\n\nWe recommend that you either uninstall watchman (and XDE will try to use a copy it is bundled with) or upgrade watchman to a newer version, at least v${MIN_WATCHMAN_VERSION}.`;

    // Add a note about homebrew if the user is on a Mac
    if (process.platform === 'darwin') {
      warningMessage += `\n\nIf you are using homebrew, try:\nbrew uninstall watchman; brew install watchman`;
    }
    ProjectUtils.logWarning(projectRoot, 'exponent', warningMessage);
  }
}

async function _validateAssetFieldsAsync(projectRoot, exp) {
  try {
    const assetSchemas = await ExpSchema.getAssetSchemasAsync(exp.sdkVersion);
    await Promise.all(assetSchemas.map(async ({
      fieldPath,
      schema: {
        meta: { asset, contentTypePattern, contentTypeHuman },
      },
    }) => {
      const value = _.get(exp, fieldPath);
      if (asset && value) {
        if (contentTypePattern) {
          // NOTE(nikki): The '4100' below should be enough for most file types, though we
          //              could probably go shorter....
          //              http://www.garykessler.net/library/file_sigs.html
          const filePath = path.resolve(projectRoot, value);
          const contentType = fs.existsSync(filePath) ?
                              fileType(await readChunk(filePath, 0, 4100)).mime :
                              (await request.promise.head({ url: value })).headers['content-type'];
          if (!contentType.match(new RegExp(contentTypePattern))) {
            const configName = await ProjectUtils.configFilenameAsync(projectRoot);
            ProjectUtils.logWarning(projectRoot, 'exponent', `Warning: Problem in ${configName}. Field '${fieldPath}' should point to a ${contentTypeHuman}, but the file at '${value}' has type '${contentType}'. See ${Config.helpUrl}`);
          }
        }
      }
    }));
  } catch (e) {
    ProjectUtils.logWarning(projectRoot, 'exponent', `Warning: Problem validating asset fields: ${e.message}.`);
  }
}

async function _validatePackageJsonAndExpJsonAsync(exp, pkg, projectRoot): Promise<number>  {
  if (!exp || !pkg) {
    // readConfigJsonAsync already logged an error
    return FATAL;
  }

  try {
    await _checkWatchmanVersionAsync(projectRoot);
  } catch (e) {
    ProjectUtils.logWarning(projectRoot, 'exponent', `Warning: Problem checking watchman version. ${e.message}.`);
  }

  const expJsonExists = await ProjectUtils.fileExistsAsync(path.join(projectRoot, 'exp.json'));
  const appJsonExists = await ProjectUtils.fileExistsAsync(path.join(projectRoot, 'app.json'));

  if (expJsonExists && appJsonExists) {
    ProjectUtils.logWarning(projectRoot, 'exponent', `Warning: Both app.json and exp.json exist in this directory. Only one should exist for a single project.`);
    return WARNING;
  }

  let sdkVersion = exp.sdkVersion;
  const configName = await ProjectUtils.configFilenameAsync(projectRoot);
  try {
    // TODO(perry) figure out a way to tell the schema validator whether this is exp.json or app.json
    let schema = await ExpSchema.getSchemaAsync(sdkVersion);
    let validator = new jsonschema.Validator();
    let validationResult = validator.validate(exp, schema);
    if (validationResult.errors && validationResult.errors.length > 0) {
      let fullMessage = `Warning: Problem${validationResult.errors.length > 1 ? 's' : ''} in ${configName}. See https://docs.getexponent.com/versions/v${sdkVersion}/guides/configuration.html.`;

      for (let error of validationResult.errors) {
        // Formate the message nicely
        let message = error.stack.replace(/instance\./g, '').replace(/exists in instance/g, `exists in ${configName}`).replace('instance additionalProperty', 'additional property');
        fullMessage += `\n  - ${message}.`;
      }

      ProjectUtils.logWarning(projectRoot, 'exponent', fullMessage);
      return WARNING;
    }
  } catch (e) {
    ProjectUtils.logWarning(projectRoot, 'exponent', `Warning: Problem validating ${configName}: ${e.message}.`);
  }

  // Warn if sdkVersion is UNVERSIONED
  if (sdkVersion === 'UNVERSIONED') {
    ProjectUtils.logWarning(projectRoot, 'exponent', `Warning: Using unversioned Exponent SDK. Do not publish until you set sdkVersion in ${configName}`);
    return WARNING;
  }

  // react-native is required
  if (!pkg.dependencies || !pkg.dependencies['react-native']) {
    ProjectUtils.logWarning(projectRoot, 'exponent', `Warning: Can't find react-native in package.json dependencies`);
    return WARNING;
  }

  // TODO(adam) set up caching for this
  let sdkVersions = await Api.sdkVersionsAsync();
  if (!sdkVersions) {
    ProjectUtils.logWarning(projectRoot, 'exponent', `Warning: Couldn't connect to SDK versions server`);
    return WARNING;
  }

  if (!sdkVersions[sdkVersion]) {
    ProjectUtils.logWarning(projectRoot, 'exponent', `Warning: Invalid sdkVersion. Valid options are ${_.keys(sdkVersions).join(', ')}`);
    return WARNING;
  }

  if (Config.validation.reactNativeVersionWarnings) {
    let reactNative = pkg.dependencies['react-native'];

    // Exponent fork of react-native is required
    // TODO(2016-12-20): Remove the check for our old "exponentjs" org eventually
    if (!reactNative.match(/exponent(?:js)?\/react-native/)) {
      ProjectUtils.logWarning(projectRoot, 'exponent', `Warning: Not using the Exponent fork of react-native. See ${Config.helpUrl}.`);
      return WARNING;
    }

    let reactNativeTag = reactNative.substring(reactNative.lastIndexOf('#') + 1);
    let sdkVersionObject = sdkVersions[sdkVersion];
    try {
      // TODO: Want to be smarter about this. Maybe warn if there's a newer version.
      if (semver.major(Versions.parseSdkVersionFromTag(reactNativeTag)) !==
          semver.major(Versions.parseSdkVersionFromTag(sdkVersionObject['exponentReactNativeTag']))) {
        ProjectUtils.logWarning(projectRoot, 'exponent', `Warning: Invalid version of react-native for sdkVersion ${sdkVersion}. Use github:exponent/react-native#${sdkVersionObject['exponentReactNativeTag']}`);
        return WARNING;
      }
    } catch (e) {
      ProjectUtils.logWarning(projectRoot, 'exponent', `Warning: ${reactNative} is not a valid version. Version must be in the form of sdk-x.y.z. Please update your package.json file.`);
      return WARNING;
    }
  }

  // TODO: Check any native module versions here

  return NO_ISSUES;
}

// TODO: use `yarn check`
async function _validateNodeModulesAsync(projectRoot): Promise<number>  {
  let { exp, pkg } = await ProjectUtils.readConfigJsonAsync(projectRoot);
  let nodeModulesPath = projectRoot;
  if (exp.nodeModulesPath) {
    nodeModulesPath = path.join(projectRoot, exp.nodeModulesPath);
  }

  // Check to make sure node_modules exists at all
  try {
    let result = fs.statSync(path.join(nodeModulesPath, 'node_modules'));
    if (!result.isDirectory()) {
      ProjectUtils.logError(projectRoot, 'exponent', `Error: node_modules directory is missing. Please run \`npm install\` in your project directory.`);
      return FATAL;
    }
  } catch (e) {
    ProjectUtils.logError(projectRoot, 'exponent', `Error: node_modules directory is missing. Please run \`npm install\` in your project directory.`);
    return FATAL;
  }

  // Check to make sure react native is installed
  try {
    let result = fs.statSync(path.join(nodeModulesPath, 'node_modules', 'react-native', 'local-cli', 'cli.js'));
    if (!result.isFile()) {
      ProjectUtils.logError(projectRoot, 'exponent', `Error: React native is not installed. Please run \`npm install\` in your project directory.`);
      return FATAL;
    }
  } catch (e) {
    ProjectUtils.logError(projectRoot, 'exponent', `Error: React native is not installed. Please run \`npm install\` in your project directory.`);
    return FATAL;
  }

  // Validate all package.json dependencies are installed and up to date
  if (pkg.dependencies) {
    await Binaries.sourceBashLoginScriptsAsync();

    try {
      await spawnAsync('npm', ['--version']);
    } catch (e) {
      ProjectUtils.logWarning(projectRoot, 'exponent', `\`npm\` command not found. If you have npm installed please run \`npm install -g exp && exp path\`.`);
      return WARNING;
    }

    let npmls;
    try {
      let npmlsCommand = await spawnAsync('npm', ['ls', '--json', '--depth', '1'], {
        cwd: nodeModulesPath,
      });
      npmls = npmlsCommand.stdout;
    } catch (e) {
      npmls = e.stdout; // `npm ls` sometimes returns an error code
    }

    if (!npmls) {
      ProjectUtils.logWarning(projectRoot, 'exponent', `Problem checking node_modules dependencies. Could not run \`npm ls\` in ${projectRoot}.`);
      return WARNING;
    }

    let npmlsDependencies;
    try {
      npmlsDependencies = JSON.parse(npmls).dependencies;
    } catch (e) {
      ProjectUtils.logWarning(projectRoot, 'exponent', `Problem checking node_modules dependencies: ${e.message}`);
      return WARNING;
    }

    if (npmlsDependencies) {
      let errorStrings = [];
      _.forEach(pkg.dependencies, (versionRequired, dependency) => {
        let installedDependency = npmlsDependencies[dependency];
        if (!installedDependency || !installedDependency.version) {
          if (installedDependency && installedDependency.peerMissing) {
            errorStrings.push(`Warning: '${dependency}' peer depencency missing. Run \`npm ls\` in ${nodeModulesPath} to see full warning.`);
          } else {
            errorStrings.push(`Warning: '${dependency}' dependency is not installed.`);
          }
        }
        // TODO: also check react-native
        else if (dependency !== 'react-native' && !semver.satisfies(installedDependency.version, versionRequired) && !versionRequired.includes(installedDependency.from)) {
          // For react native, `from` field looks like "exponent/react-native#sdk-8.0.1" and
          // versionRequired looks like "github:exponent/react-native#sdk-8.0.0"
          errorStrings.push(`Warning: Installed version ${installedDependency.version} of '${dependency}' does not satisfy required version ${versionRequired}`);
        }
      });

      if (errorStrings.length > 0) {
        errorStrings.push(`\nIf there is an issue running your project, please run \`npm install\` in ${nodeModulesPath} and restart.`);
        ProjectUtils.logWarning(projectRoot, 'exponent', errorStrings.join('\n'));
        return WARNING;
      }
    }
  }

  return NO_ISSUES;
}

export async function validateLowLatencyAsync(projectRoot: string): Promise<number> {
  return validateAsync(projectRoot, false);
}

export async function validateWithNetworkAsync(projectRoot: string): Promise<number> {
  return validateAsync(projectRoot, true);
}

async function validateAsync(projectRoot: string, allowNetwork: boolean): Promise<number> {
  let { exp, pkg } = await ProjectUtils.readConfigJsonAsync(projectRoot);
  let status = await _validatePackageJsonAndExpJsonAsync(exp, pkg, projectRoot);

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

export const EXPONENT_SDK_INSTALLED_AND_IMPORTED = 0;
export const EXPONENT_SDK_NOT_INSTALLED = 1;
export const EXPONENT_SDK_NOT_IMPORTED = 2;

export async function getExponentSdkStatus(projectRoot: string): Promise<number> {
  let { pkg } = await ProjectUtils.readConfigJsonAsync(projectRoot);
  try {
    let exponentDep = pkg.dependencies['exponent'];
    if (!exponentDep) {
      return EXPONENT_SDK_NOT_INSTALLED;
    }

    let mainFilePath = path.join(projectRoot, pkg.main);
    let mainFile = await fs.readFile.promise(mainFilePath, 'utf8');

    // TODO: support separate .ios.js and .android.js files
    if (mainFile.includes(`from 'exponent'`) || mainFile.includes(`require('exponent')`)) {
      return EXPONENT_SDK_INSTALLED_AND_IMPORTED;
    } else {
      return EXPONENT_SDK_NOT_IMPORTED;
    }
  } catch (e) {
    return EXPONENT_SDK_NOT_IMPORTED;
  }
}
