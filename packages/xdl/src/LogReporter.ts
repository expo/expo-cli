import { serializeError } from 'serialize-error';
import escapeRegExp from 'lodash/escapeRegExp';
import fs from 'fs-extra';
import path from 'path';
class LogReporter {
  update(event: any) {
    if (event.error instanceof Error) {
      event.error = serializeError(event.error);
    }

    const projectRoot = fs.realpathSync(process.cwd());
    _logPackagerOutput(projectRoot, event.error ? 'error' : 'info', JSON.stringify(event));
    // console.log(JSON.stringify(event));
  }
}

module.exports = LogReporter;

import * as ProjectUtils from './project/ProjectUtils';

function _logPackagerOutput(projectRoot: string, level: string, data: string) {
  let output = data.toString();
  if (!output) {
    return;
  }
  // Temporarily hide warnings about duplicate providesModule declarations
  // under react-native
  if (_isIgnorableDuplicateModuleWarning(projectRoot, level, output)) {
    ProjectUtils.logDebug(
      projectRoot,
      'expo',
      `Suppressing @providesModule warning: ${output}`,
      'project-suppress-providesmodule-warning'
    );
    return;
  }
  if (_isIgnorableMetroConsoleOutput(output) || _isIgnorableRnpmWarning(output)) {
    ProjectUtils.logDebug(projectRoot, 'expo', output);
    return;
  }

  if (/^Scanning folders for symlinks in /.test(output)) {
    ProjectUtils.logDebug(projectRoot, 'metro', output);
    return;
  }
  if (level === 'info') {
    ProjectUtils.logInfo(projectRoot, 'metro', output);
  } else {
    ProjectUtils.logError(projectRoot, 'metro', output);
  }
}

function _isIgnorableMetroConsoleOutput(output: string) {
  // As of React Native 0.61.x, Metro prints console logs from the device to console, without
  // passing them through the custom log reporter.
  //
  // Managed apps have a separate remote logging implementation included in the Expo SDK,
  // (see: _handleDeviceLogs), so we can just ignore these device logs from Metro.
  // if (/^ () /)
  //
  // These logs originate from:
  // https://github.com/facebook/metro/blob/e8181fb9db7db31adf7d1ed9ab840f54449ef238/packages/metro/src/lib/logToConsole.js#L50
  return /^\s+(INFO|WARN|LOG|GROUP|DEBUG) /.test(output);
}

function _isIgnorableRnpmWarning(output: string) {
  return output.startsWith(
    'warn The following packages use deprecated "rnpm" config that will stop working from next release'
  );
}

function _isIgnorableDuplicateModuleWarning(
  projectRoot: string,
  level: string,
  output: string
): boolean {
  if (
    level !== 'error' ||
    !output.startsWith('jest-haste-map: @providesModule naming collision:')
  ) {
    return false;
  }

  let reactNativeNodeModulesPath = path.join(
    projectRoot,
    'node_modules',
    'react-native',
    'node_modules'
  );
  let reactNativeNodeModulesPattern = escapeRegExp(reactNativeNodeModulesPath);
  let reactNativeNodeModulesCollisionRegex = new RegExp(
    `Paths: ${reactNativeNodeModulesPattern}.+ collides with ${reactNativeNodeModulesPattern}.+`
  );
  return reactNativeNodeModulesCollisionRegex.test(output);
}
