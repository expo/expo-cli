/**
 * @flow
 */

import _ from 'lodash';
import child_process from 'child_process';
import fs from 'fs-extra';
import JsonFile from '@expo/json-file';
import os from 'os';
import path from 'path';
import rimraf from 'rimraf';
import spawnAsync from '@expo/spawn-async';
import tar from 'tar';

import ip from './ip';
import Api from './Api';
import * as Binaries from './Binaries';
import * as Env from './Env';
import FormData from './tools/FormData';
import { isNode } from './tools/EnvironmentHelper';
import UserManager from './User';
import UserSettings from './UserSettings';
import * as Utils from './Utils';
import * as Watchman from './Watchman';

async function _uploadLogsAsync(info: any): Promise<boolean | string> {
  let user = await UserManager.getCurrentUserAsync();
  let username = user ? user.username : 'anonymous';

  // write info to file
  let expoHome = UserSettings.dotExpoHomeDirectory();
  let infoJsonFile = new JsonFile(path.join(expoHome, 'debug-info.json'));
  await infoJsonFile.writeAsync(info);

  // copy files to tempDir
  let tempDir = path.join(Env.home(), `${username}-diagnostics`);
  let archivePath = path.join(expoHome, 'diagnostics.tar.gz');
  await Utils.ncpAsync(expoHome, tempDir, {
    filter: filename => {
      if (
        filename.includes('diagnostics') ||
        filename.includes('starter-app-cache') ||
        filename.includes('android-apk-cache') ||
        filename.includes('ios-simulator-app-cache') ||
        filename.includes('state.json~')
      ) {
        return false;
      } else {
        return true;
      }
    },
  });

  // remove access token
  try {
    let settingsJsonFile = new JsonFile(path.join(tempDir, UserSettings.SETTINGS_FILE_NAME));
    let settingsJson = await settingsJsonFile.readAsync();
    settingsJson.accessToken = 'redacted';
    settingsJson.auth = 'redacted';
    await settingsJsonFile.writeAsync(settingsJson);
  } catch (e) {
    console.error(e);
  }

  // compress
  await tar.create({ file: archivePath, gzip: true, cwd: Env.home() }, [
    path.relative(Env.home(), tempDir),
  ]);
  rimraf.sync(tempDir);

  // upload
  let file;
  if (isNode()) {
    file = fs.createReadStream(archivePath);
  } else {
    file = new Blob([await fs.readFile(archivePath)]);
  }
  let formData = new FormData();
  formData.append('archive', file);

  let response = await Api.callMethodAsync('uploadDiagnostics', [{}], 'put', null, { formData });
  return response.url;
}

/* eslint-disable prefer-template */
// From http://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
function _formatBytes(bytes: number): string {
  if (bytes >= 1000000000) {
    return (bytes / 1000000000).toFixed(2) + ' GB';
  } else if (bytes >= 1000000) {
    return (bytes / 1000000).toFixed(2) + ' MB';
  } else if (bytes >= 1000) {
    return (bytes / 1000).toFixed(2) + ' KB';
  } else if (bytes > 1) {
    return bytes + ' bytes';
  } else if (bytes === 1) {
    return bytes + '${bytes} byte';
  } else {
    return '0 bytes';
  }
}
/* eslint-enable prefer-template */

export async function getDeviceInfoAsync(options: any = {}): Promise<any> {
  let info = {};

  await Binaries.sourceBashLoginScriptsAsync();
  let whichCommand = process.platform === 'win32' ? 'where' : 'which';

  try {
    let result = await spawnAsync('node', ['--version']);
    info.nodeVersion = _.trim(result.stdout);
  } catch (e) {}

  try {
    let result = await spawnAsync(whichCommand, ['node']);
    info.nodePath = _.trim(result.stdout);
  } catch (e) {}

  try {
    let result = await spawnAsync('npm', ['--version']);
    info.npmVersion = _.trim(result.stdout);
  } catch (e) {}

  try {
    let result = await spawnAsync(whichCommand, ['npm']);
    info.npmPath = _.trim(result.stdout);
  } catch (e) {}

  try {
    info.watchmanVersion = await Watchman.unblockAndGetVersionAsync();
  } catch (e) {}

  try {
    let result = await spawnAsync(whichCommand, ['watchman']);
    info.watchmanPath = _.trim(result.stdout);
  } catch (e) {}

  try {
    let result = await spawnAsync('adb', ['version']);
    info.adbVersion = _.trim(result.stdout);
  } catch (e) {}

  try {
    let result = await spawnAsync(whichCommand, ['adb']);
    info.adbPath = _.trim(result.stdout);
  } catch (e) {}

  info.path = process.env.PATH;
  info.shell = process.env.SHELL;
  info.home = os.homedir();
  info.nvmPath = process.env.NVM_PATH;
  info.lang = process.env.LANG;
  info.dirname = __dirname;
  info.memoryFree = _formatBytes(os.freemem());
  info.memoryTotal = _formatBytes(os.totalmem());
  info.ip = ip.address();
  info.hostname = os.hostname();

  // TODO: fix these commands on linux
  if (process.platform === 'darwin') {
    // || process.platform === 'linux') {
    try {
      info.xdeProcesses = _.trim(child_process.execSync('pgrep XDE | xargs ps -p').toString());
    } catch (e) {}

    try {
      info.numXdeProcesses = _.trim(child_process.execSync('pgrep XDE | wc -l').toString());
    } catch (e) {}

    try {
      info.watchmanProcesses = _.trim(
        child_process.execSync('pgrep watchman | xargs ps -p').toString()
      );
    } catch (e) {}

    try {
      info.numWatchmanProcesses = _.trim(
        child_process.execSync('pgrep watchman | wc -l').toString()
      );
    } catch (e) {}

    try {
      info.ngrokProcesses = _.trim(child_process.execSync('pgrep ngrok | xargs ps -p').toString());
    } catch (e) {}

    try {
      info.numNgrokProcesses = _.trim(child_process.execSync('pgrep ngrok | wc -l').toString());
    } catch (e) {}
  }

  if (process.platform === 'darwin') {
    // `xcrun` and `xcodebuild` will pop up a dialog if Xcode isn't installed
    if (Binaries.isXcodeInstalled()) {
      try {
        let result = await spawnAsync('xcrun', ['--version']);
        info.xcrunVersion = _.trim(result.stdout);
      } catch (e) {}

      try {
        let result = await spawnAsync('xcodebuild', ['-version']);
        info.xcodebuildVersion = _.trim(result.stdout);
      } catch (e) {}
    }

    try {
      let result = await spawnAsync('launchctl', ['limit']);
      info.launchctlLimit = _.trim(result.stdout);
    } catch (e) {}
  }

  // TODO: can probably get rid of these options if we remove Intercom
  if (options.uploadLogs) {
    info.url = await _uploadLogsAsync(info);
  }

  if (options.limitLengthForIntercom) {
    info = _.mapValues(info, value => {
      if (value && value.length > 100 && !value.startsWith('http')) {
        return value.substring(0, 100);
      } else {
        return value;
      }
    });
  }

  return info;
}
