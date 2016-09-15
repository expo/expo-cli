/**
 * @flow
 */

import 'instapromise';

import delayAsync from 'delay-async';
import download from 'download';
import existsAsync from 'exists-async';
import glob from 'glob';
import homeDir from 'home-dir';
import mkdirp from 'mkdirp';
import osascript from '@exponent/osascript';
import path from 'path';
import semver from 'semver';
import spawnAsync from '@exponent/spawn-async';

import * as Analytics from './Analytics';
import Api from './Api';
import ErrorCode from './ErrorCode';
import Logger from './Logger';
import NotificationCode from './NotificationCode';
import UserSettings from './UserSettings';
import XDLError from './XDLError';

let _lastUrl = null;

export function isPlatformSupported() {
  return process.platform === 'darwin';
}

function _isLicenseOutOfDate(text) {
  let lower = text.toLowerCase();
  return lower.includes('xcode') && lower.includes('license');
}

async function _xcrunAsync(args) {
  try {
    return await spawnAsync('xcrun', args);
  } catch (e) {
    if (_isLicenseOutOfDate(e.stdout) || _isLicenseOutOfDate(e.stderr)) {
      throw new XDLError(ErrorCode.XCODE_LICENSE_NOT_ACCEPTED, 'Xcode license is not accepted. Please run `sudo xcodebuild -license`.');
    } else {
      throw e;
    }
  }
}

// Simulator installed
export async function _isSimulatorInstalledAsync() {
  let result;
  try {
    result = (await osascript.execAsync('id of app "Simulator"')).trim();
  } catch (e) {
    console.error("Can't determine id of Simulator app; the Simulator is most likely not installed on this machine", e);
    Logger.global.error("Simulator not installed. Please visit https://developer.apple.com/xcode/download/ to download Xcode and the iOS simulator");
    return false;
  }
  if (result === 'com.apple.iphonesimulator') {
    return true;
  } else {
    console.warn("Simulator is installed but is identified as '" + result + "'; don't know what that is.");
    Logger.global.error("Simulator not installed. Please visit https://developer.apple.com/xcode/download/ to download Xcode and the iOS simulator");
    return false;
  }
}

// Simulator opened
export async function _openSimulatorAsync() {
  if (!(await _isSimulatorRunningAsync())) {
    Logger.global.info("Opening iOS simulator");
    await spawnAsync('open', ['-a', 'Simulator']);
    await _waitForSimulatorRunningAsync();
  }
}

export async function _isSimulatorRunningAsync() {
  let zeroMeansNo = (await osascript.execAsync('tell app "System Events" to count processes whose name is "Simulator"')).trim();
  if (zeroMeansNo === '0') {
    return false;
  }

  let bootedDevice = await _bootedSimulatorDeviceAsync();
  return !!bootedDevice;
}

async function _waitForSimulatorRunningAsync() {
  if (await _isSimulatorRunningAsync()) {
    return true;
  } else {
    await delayAsync(100);
    return await _waitForSimulatorRunningAsync();
  }
}

async function _listSimulatorDevicesAsync() {
  let infoJson = await _xcrunAsync(['simctl', 'list', 'devices', '--json']);
  let info = JSON.parse(infoJson.stdout);
  return info;
}

async function _bootedSimulatorDeviceAsync() {
  let simulatorDeviceInfo = await _listSimulatorDevicesAsync();
  for (let runtime in simulatorDeviceInfo.devices) {
    let devices = simulatorDeviceInfo.devices[runtime];
    for (let i = 0; i < devices.length; i++) {
      let device = devices[i];
      if (device.state === 'Booted') {
        return device;
      }
    }
  }
  return null;
}

export function _dirForSimulatorDevice(udid: string) {
  return path.resolve(homeDir(), 'Library/Developer/CoreSimulator/Devices', udid);
}

export async function _quitSimulatorAsync() {
  return await osascript.execAsync('tell application "Simulator" to quit');
}

// Exponent installed
export async function _isExponentAppInstalledOnCurrentBootedSimulatorAsync() {
  let device = await _bootedSimulatorDeviceAsync();
  if (!device) {
    return false;
  }
  let simDir = await _dirForSimulatorDevice(device.udid);
  let matches = await glob.promise('./data/Containers/Data/Application/*/Library/Caches/Snapshots/host.exp.Exponent', {cwd: simDir});

  return (matches.length > 0);
}

export async function _waitForExponentAppInstalledOnCurrentBootedSimulatorAsync() {
  if (await _isExponentAppInstalledOnCurrentBootedSimulatorAsync()) {
    return true;
  } else {
    await delayAsync(100);
    return await _waitForExponentAppInstalledOnCurrentBootedSimulatorAsync();
  }
}

export async function _exponentVersionOnCurrentBootedSimulatorAsync() {
  let device = await _bootedSimulatorDeviceAsync();
  if (!device) {
    return null;
  }
  let simDir = await _dirForSimulatorDevice(device.udid);
  let matches = await glob.promise('./data/Containers/Bundle/Application/*/Exponent-*.app', {cwd: simDir});

  if (matches.length === 0) {
    return null;
  }

  let regex = /Exponent\-([0-9\.]+)\.app/;
  let regexMatch = regex.exec(matches[0]);
  if (regexMatch.length < 2) {
    return null;
  }

  return regexMatch[1];
}

export async function _checkExponentUpToDateAsync() {
  let versions = await Api.versionsAsync();
  let installedVersion = await _exponentVersionOnCurrentBootedSimulatorAsync();

  if (!installedVersion || semver.lt(installedVersion, versions.iosVersion)) {
    Logger.notifications.warn({code: NotificationCode.OLD_IOS_APP_VERSION}, 'This version of the Exponent app is out of date. Uninstall the app and run again to upgrade.');
  }
}

export async function _downloadSimulatorAppAsync() {
  let versions = await Api.versionsAsync();
  let dir = path.join(_simulatorCacheDirectory(), `Exponent-${versions.iosVersion}.app`);

  if (await existsAsync(dir)) {
    return dir;
  }

  mkdirp.sync(dir);
  let url = `https://s3.amazonaws.com/exp-ios-simulator-apps/Exponent-${versions.iosVersion}.app.zip`;
  await new download({extract: true}).get(url).dest(dir).promise.run();
  return dir;
}

export async function _installExponentOnSimulatorAsync() {
  Logger.global.info(`Downloading latest version of Exponent`);
  Logger.notifications.info({code: NotificationCode.START_LOADING});
  let dir = await _downloadSimulatorAppAsync();
  Logger.global.info("Installing Exponent on iOS simulator");
  let result = await _xcrunAsync(['simctl', 'install', 'booted', dir]);
  Logger.notifications.info({code: NotificationCode.STOP_LOADING});
  return result;
}

export async function _uninstallExponentAppFromSimulatorAsync() {
  try {
    Logger.global.info('Uninstalling Exponent from iOS simulator.');
    await _xcrunAsync(['simctl', 'uninstall', 'booted', 'host.exp.Exponent']);
  } catch (e) {
    if (e.message && e.message.includes('No devices are booted.')) {
      return null;
    } else {
      console.error(e);
      throw e;
    }
  }
}

export function _simulatorCacheDirectory() {
  let dotExponentHomeDirectory = UserSettings.dotExponentHomeDirectory();
  let dir = path.join(dotExponentHomeDirectory, 'ios-simulator-app-cache');
  mkdirp.sync(dir);
  return dir;
}

export async function upgradeExponentAsync() {
  if (!(await _isSimulatorInstalledAsync())) {
    return;
  }

  await _openSimulatorAsync();

  await _uninstallExponentAppFromSimulatorAsync();
  await _installExponentOnSimulatorAsync();

  if (_lastUrl) {
    Logger.global.info(`Opening ${_lastUrl} in Exponent.`);
    await _xcrunAsync(['simctl', 'openurl', 'booted', _lastUrl]);
    _lastUrl = null;
  }
}

// Open Url
export async function _openUrlInSimulatorAsync(url: string) {
  _lastUrl = url;
  _checkExponentUpToDateAsync(); // let this run in background
  return await _xcrunAsync(['simctl', 'openurl', 'booted', url]);
}

export async function _tryOpeningSimulatorInstallingExponentAndOpeningLinkAsync(url: string) {
  await _openSimulatorAsync();

  if (!(await _isExponentAppInstalledOnCurrentBootedSimulatorAsync())) {
    await _installExponentOnSimulatorAsync();
    await _waitForExponentAppInstalledOnCurrentBootedSimulatorAsync();
  }

  Logger.global.info(`Opening ${url} in iOS simulator`);
  await _openUrlInSimulatorAsync(url);
}

export async function openUrlInSimulatorSafeAsync(url: string) {
  if (!(await _isSimulatorInstalledAsync())) {
    return;
  }

  try {
    await _tryOpeningSimulatorInstallingExponentAndOpeningLinkAsync(url);
  } catch (e) {
    if (e.isXDLError) {
      // Hit some internal error, don't try again.
      // This includes Xcode license errors
      Logger.global.error(e.message);
      return;
    }

    Logger.global.error('Error running app. Uninstalling exponent and trying again.');

    try {
      await _uninstallExponentAppFromSimulatorAsync();
    } catch (uninstallError) {}

    await _tryOpeningSimulatorInstallingExponentAndOpeningLinkAsync(url);
  }

  Analytics.logEvent('Open Url on Device', {
    platform: 'ios',
  });
}
