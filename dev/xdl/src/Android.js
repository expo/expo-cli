/**
 * @flow
 */

import 'instapromise';

import _ from 'lodash';
import download from 'download';
import spawnAsync from '@exponent/spawn-async';
import existsAsync from 'exists-async';
import mkdirp from 'mkdirp';
import path from 'path';

import Api from './Api';
import Logger from './Logger';
import NotificationCode from './NotificationCode';
import * as ProjectSettings from './ProjectSettings';
import UserSettings from './UserSettings';
import * as UrlUtils from './UrlUtils';

let _lastUrl = null;

let options;
let binaryName;

if (process.platform === 'darwin') {
  options = {
    cwd: path.join(__dirname, '..', 'adb', 'osx'),
  };
  binaryName = './adb';
} else if (process.platform === 'win32') {
  options = {
    cwd: path.join(__dirname, '..', 'adb', 'windows'),
  };
  binaryName = '.\\adb.exe';
}

export function isPlatformSupported() {
  return process.platform === 'darwin' || process.platform === 'win32';
}

async function _getAdbOutput(args) {
  let result = await spawnAsync(binaryName, args, options);
  return result.stdout;
}

// Device attached
async function _isDeviceAttachedAsync() {
  let devices = await _getAdbOutput(['devices']);
  let lines = _.trim(devices).split(/\r?\n/);
  // First line is "List of devices".
  return lines.length > 1;
}

async function _isDeviceAuthorizedAsync() {
  let devices = await _getAdbOutput(['devices']);
  let lines = _.trim(devices).split(/\r?\n/);
  lines.shift();
  let listOfDevicesWithoutFirstLine = lines.join('\n');
  // result looks like "072c4cf200e333c7	device" when authorized
  // and "072c4cf200e333c7	unauthorized" when not.
  return listOfDevicesWithoutFirstLine.includes('device');
}

// Exponent installed
async function _isExponentInstalledAsync() {
  let packages = await _getAdbOutput(['shell', 'pm', 'list', 'packages', '-f']);
  let lines = packages.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.includes('host.exp.exponent.test')) {
      continue;
    }

    if (line.includes('host.exp.exponent')) {
      return true;
    }
  }

  return false;
}

async function _exponentVersionAsync() {
  let info = await _getAdbOutput(['shell', 'dumpsys', 'package', 'host.exp.exponent']);

  let regex = /versionName\=([0-9\.]+)/;
  let regexMatch = regex.exec(info);
  if (regexMatch.length < 2) {
    return null;
  }

  return regexMatch[1];
}

async function _checkExponentUpToDateAsync() {
  let versions = await Api.versionsAsync();
  let installedVersion = await _exponentVersionAsync();

  if (!installedVersion || installedVersion !== versions.androidVersion) {
    Logger.notifications.warn({code: NotificationCode.OLD_ANDROID_APP_VERSION}, 'This version of the Exponent app is out of date. Uninstall the app and run again to upgrade.');
  }
}

function _apkCacheDirectory() {
  let dotExponentHomeDirectory = UserSettings.dotExponentHomeDirectory();
  let dir = path.join(dotExponentHomeDirectory, 'android-apk-cache');
  mkdirp.sync(dir);
  return dir;
}

async function _downloadApkAsync() {
  let versions = await Api.versionsAsync();
  let apkPath = path.join(_apkCacheDirectory(), `Exponent-${versions.androidVersion}.apk`);

  if (await existsAsync(apkPath)) {
    return apkPath;
  }

  let url = `https://s3.amazonaws.com/exp-android-apks/Exponent-${versions.androidVersion}.apk`;
  await new download().get(url).dest(_apkCacheDirectory()).promise.run();
  return apkPath;
}

async function _installExponentAsync() {
  Logger.global.info(`Downloading latest version of Exponent`);
  Logger.notifications.info({code: NotificationCode.START_LOADING});
  let path = await _downloadApkAsync();
  Logger.global.info(`Installing Exponent on device`);
  let result = await _getAdbOutput(['install', path]);
  Logger.notifications.info({code: NotificationCode.STOP_LOADING});
  return result;
}

async function _uninstallExponentAsync() {
  Logger.global.info('Uninstalling Exponent from Android device.');
  return await _getAdbOutput(['uninstall', 'host.exp.exponent']);
}

export async function upgradeExponentAsync() {
  await _uninstallExponentAsync();
  await _installExponentAsync();

  if (_lastUrl) {
    Logger.global.info(`Opening ${_lastUrl} in Exponent.`);
    await _getAdbOutput(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', _lastUrl]);
    _lastUrl = null;
  }
}

// Open Url
async function _openUrlAsync(url: string) {
  _lastUrl = url;
  _checkExponentUpToDateAsync(); // let this run in background
  return await _getAdbOutput(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url]);
}

export async function openUrlSafeAsync(url: string) {
  if (!(await _isDeviceAttachedAsync())) {
    Logger.global.error(`No Android device found. Please connect a device and enable USB debugging.`);
    return;
  }

  if (!(await _isDeviceAuthorizedAsync())) {
    Logger.global.error(`This computer is not authorized to debug the device. Please allow USB debugging.`);
    return;
  }

  if (!(await _isExponentInstalledAsync())) {
    await _installExponentAsync();
  }

  Logger.global.info(`Opening on Android device`);
  await _openUrlAsync(url);
}

export async function openProjectAsync(projectRoot: string) {
  await startAdbReverseAsync(projectRoot);

  let projectUrl = await UrlUtils.constructManifestUrlAsync(projectRoot);
  await openUrlSafeAsync(projectUrl);
}

// Adb reverse
export async function startAdbReverseAsync(projectRoot: string) {
  let packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  return await adbReverse(packagerInfo.packagerPort) && await adbReverse(packagerInfo.exponentServerPort);
}

export async function stopAdbReverseAsync(projectRoot: string) {
  let packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  await adbReverseRemove(packagerInfo.packagerPort);
  await adbReverseRemove(packagerInfo.exponentServerPort);
}

async function adbReverse(port: number) {
  try {
    await _getAdbOutput(['reverse', `tcp:${port}`, `tcp:${port}`]);
    return true;
  } catch (e) {
    console.warn(`Couldn't adb reverse: ${e.toString()}`);
    return false;
  }
}

async function adbReverseRemove(port: number) {
  try {
    await _getAdbOutput(['reverse', '--remove', `tcp:${port}`]);
    return true;
  } catch (e) {
    console.warn(`Couldn't adb reverse remove: ${e.toString()}`);
    return false;
  }
}
