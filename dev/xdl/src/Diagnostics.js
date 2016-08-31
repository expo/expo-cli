/**
 * @flow
 */

import 'instapromise';

import _ from 'lodash';
import aws from 'aws-sdk';
import child_process from 'child_process';
import diskusage from 'diskusage';
import fs from 'fs';
import ip from 'ip';
import os from 'os';
import path from 'path';
import rimraf from 'rimraf';
import spawnAsync from '@exponent/spawn-async';
import targz from 'tar.gz';
import uuid from 'node-uuid';

import * as Binaries from './Binaries';
import * as Env from './Env';
import * as User from './User';
import UserSettings from './UserSettings';

function _s3Client() {
  aws.config.update({
    accessKeyId: 'AKIAJRAQBU4Y4W7IKXLQ',
    secretAccessKey: '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',
    region: 'us-east-1',
  });

  return new aws.S3();
}

async function _uploadLogsAsync() {
  let user = await User.getCurrentUserAsync();
  let username = user ? user.username : 'anonymous';

  let tempDir = path.join(Env.home(), `${username}-diagnostics`);
  let exponentHome = UserSettings.dotExponentHomeDirectory();
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
  await targz().compress(tempDir, archivePath);
  rimraf.sync(tempDir);

  let file = fs.createReadStream(archivePath);
  let s3 = _s3Client();
  let uploadResult = await s3.promise.upload({
    Bucket: 'exp-xde-diagnostics',
    Key: `${username}-${uuid.v4()}.tar.gz`,
    Body: file,
    ACL: 'public-read',
  });

  return uploadResult.Location;
}

// From http://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
function _formatBytes(bytes: number): string {
  if (bytes >= 1000000000) { return (bytes / 1000000000).toFixed(2) + ' GB'; }
  else if (bytes >= 1000000) { return (bytes / 1000000).toFixed(2) + ' MB'; }
  else if (bytes >= 1000) { return (bytes / 1000).toFixed(2) + ' KB'; }
  else if (bytes > 1) { return bytes + ' bytes'; }
  else if (bytes === 1) { return bytes + '${bytes} byte'; }
  else { return '0 bytes'; }
}

export async function getDeviceInfoAsync(options: any = {}): Promise<any> {
  let info = {};

  if (options.uploadLogs) {
    info.logsUrl = await _uploadLogsAsync();
  }

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
    let result = await spawnAsync('watchman', ['--version']);
    info.watchmanVersion = _.trim(result.stdout);
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

  try {
    let result = await diskusage.promise.check((process.platform === 'win32') ? 'c:' : '/');
    info.diskAvailable = _formatBytes(result.available);
    info.diskFree = _formatBytes(result.free);
    info.diskTotal = _formatBytes(result.total);
  } catch (e) {}

  if (process.platform === 'darwin' || process.platform === 'linux') {
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

  if (options.limitLengthForIntercom) {
    info = _.mapValues(info, (value) => {
      if (value.length > 100 && !value.startsWith('http')) {
        return value.substring(0, 100);
      } else {
        return value;
      }
    });
  }

  return info;
}
