/**
 * @flow
 */

import 'instapromise';

import _ from 'lodash';
import child_process from 'child_process';
import fs from 'fs';
import ip from 'ip';
import JsonFile from '@exponent/json-file';
import os from 'os';
import path from 'path';
import rimraf from 'rimraf';
import spawnAsync from '@exponent/spawn-async';
import targz from 'tar.gz';

import Api from './Api';
import * as Binaries from './Binaries';
import * as Env from './Env';
import * as User from './User';
import UserSettings from './UserSettings';
import * as Watchman from './Watchman';

// requires python, so might not be installed
let diskusage;
try {
  diskusage = require('diskusage');
} catch (e) {}

async function _uploadLogsAsync(info) {
  let user = await User.getCurrentUserAsync();
  let username = user ? user.username : 'anonymous';

  // write info to file
  let exponentHome = UserSettings.dotExponentHomeDirectory();
  let infoJsonFile = new JsonFile(path.join(exponentHome, 'debug-info.json'));
  await infoJsonFile.writeAsync(info);

  // copy files to tempDir
  let tempDir = path.join(Env.home(), `${username}-diagnostics`);
  let archivePath = path.join(exponentHome, 'diagnostics.tar.gz');
  await Binaries.ncpAsync(exponentHome, tempDir, {
    filter: (filename) => {
      if (filename.includes('diagnostics') || filename.includes('starter-app-cache') || filename.includes('android-apk-cache') || filename.includes('ios-simulator-app-cache')) {
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
    await settingsJsonFile.writeAsync(settingsJson);
  } catch (e) {
    console.error(e);
  }

  // compress
  await targz().compress(tempDir, archivePath);
  rimraf.sync(tempDir);

  // upload
  let file = fs.createReadStream(archivePath);
  let formData = {
    archive: file,
  };

  let response = await Api.callMethodAsync('uploadDiagnostics', [{}], 'put', null, {formData});
  return response.url;
}

/* eslint-disable prefer-template */
// From http://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
function _formatBytes(bytes: number): string {
  if (bytes >= 1000000000) { return (bytes / 1000000000).toFixed(2) + ' GB'; }
  else if (bytes >= 1000000) { return (bytes / 1000000).toFixed(2) + ' MB'; }
  else if (bytes >= 1000) { return (bytes / 1000).toFixed(2) + ' KB'; }
  else if (bytes > 1) { return bytes + ' bytes'; }
  else if (bytes === 1) { return bytes + '${bytes} byte'; }
  else { return '0 bytes'; }
}
/* eslint-enable prefer-template */

export async function getDeviceInfoAsync(options: any = {}): Promise<any> {
  let info = {};

  await Binaries.sourceBashLoginScriptsAsync();
  let whichCommand = (process.platform === 'win32') ? 'where' : 'which';

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

  if (diskusage) {
    try {
      let result = await diskusage.promise.check((process.platform === 'win32') ? 'c:' : '/');
      info.diskAvailable = _formatBytes(result.available);
      info.diskFree = _formatBytes(result.free);
      info.diskTotal = _formatBytes(result.total);
    } catch (e) {}
  }

  // TODO: fix these commands on linux
  if (process.platform === 'darwin') { // || process.platform === 'linux') {
    try {
      info.xdeProcesses = _.trim(child_process.execSync('pgrep XDE | xargs ps -p').toString());
    } catch (e) {}

    try {
      info.numXdeProcesses = _.trim(child_process.execSync('pgrep XDE | wc -l').toString());
    } catch (e) {}

    try {
      info.watchmanProcesses = _.trim(child_process.execSync('pgrep watchman | xargs ps -p').toString());
    } catch (e) {}

    try {
      info.numWatchmanProcesses = _.trim(child_process.execSync('pgrep watchman | wc -l').toString());
    } catch (e) {}

    try {
      info.ngrokProcesses = _.trim(child_process.execSync('pgrep ngrok | xargs ps -p').toString());
    } catch (e) {}

    try {
      info.numNgrokProcesses = _.trim(child_process.execSync('pgrep ngrok | wc -l').toString());
    } catch (e) {}
  }

  if (process.platform === 'darwin') {
    try {
      let result = await spawnAsync('xcrun', ['--version']);
      info.xcrunVersion = _.trim(result.stdout);
    } catch (e) {}

    try {
      let result = await spawnAsync('xcodebuild', ['-version']);
      info.xcodebuildVersion = _.trim(result.stdout);
    } catch (e) {}

    try {
      let result = await spawnAsync('launchctl', ['limit']);
      info.launchctlLimit = _.trim(result.stdout);
    } catch (e) {}
  }

  if (options.uploadLogs) {
    info.url = await _uploadLogsAsync(info);
  }

  if (options.limitLengthForIntercom) {
    info = _.mapValues(info, (value) => {
      if (value && value.length > 100 && !value.startsWith('http')) {
        return value.substring(0, 100);
      } else {
        return value;
      }
    });
  }

  return info;
}
