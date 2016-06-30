import 'instapromise';

import { exec } from 'child_process';
import download from 'download';
import spawnAsync from '@exponent/spawn-async';
import existsAsync from 'exists-async';
import mkdirp from 'mkdirp';
import path from 'path';

import Api from './Api';
import Logger from './Logger';
import NotificationCode from './NotificationCode';
import UserSettings from './UserSettings';

let _lastUrl = null;

let options = {
  cwd: path.join(__dirname, '..'),
};

// Device attached
async function _isDeviceAttachedAsync() {
  let devices = await exec.promise("./adb devices | awk '!/List of devices/ && NF' | wc -l", options);
  return parseInt(devices, 10) > 0;
}

async function _isDeviceAuthorizedAsync() {
  let devices = await exec.promise("./adb devices | awk '!/List of devices/ && NF'", options);
  // result looks like "072c4cf200e333c7	device" when authorized
  // and "072c4cf200e333c7	unauthorized" when not.
  return devices.includes('device');
}

// Exponent installed
async function _isExponentInstalledAsync() {
  let packages = await exec.promise("./adb shell 'pm list packages -f'", options);
  let lines = packages.split('\n');
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
  let info = await exec.promise(`adb shell dumpsys package host.exp.exponent | grep versionName`, options);

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
  let result = await exec.promise(`./adb install ${path}`, options);
  Logger.notifications.info({code: NotificationCode.STOP_LOADING});
  return result;
}

async function _uninstallExponentAsync() {
  Logger.global.info('Uninstalling Exponent from Android device.');
  return await exec.promise(`./adb uninstall host.exp.exponent`, options);
}

async function upgradeExponentAsync() {
  await _uninstallExponentAsync();
  await _installExponentAsync();

  if (_lastUrl) {
    Logger.global.info(`Opening ${_lastUrl} in Exponent.`);
    await spawnAsync('./adb', ['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', _lastUrl], options);
    _lastUrl = null;
  }
}

// Open Url
async function _openUrlAsync(url) {
  _lastUrl = url;
  _checkExponentUpToDateAsync(); // let this run in background
  return await spawnAsync('./adb', ['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url], options);
}

async function openUrlSafeAsync(url) {
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

module.exports = {
  openUrlSafeAsync,
  upgradeExponentAsync,
};
