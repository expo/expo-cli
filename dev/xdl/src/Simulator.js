import 'instapromise';

import delayAsync from 'delay-async';
import download from 'download';
import execAsync from 'exec-async';
import existsAsync from 'exists-async';
import glob from 'glob';
import homeDir from 'home-dir';
import mkdirp from 'mkdirp';
import osascript from '@exponent/osascript';
import path from 'path';
import spawnAsync from '@exponent/spawn-async';

import Api from './Api';
import Logger from './Logger';
import NotificationCode from './NotificationCode';
import UserSettings from './UserSettings';

let _lastUrl = null;

// Simulator installed
async function _isSimulatorInstalledAsync() {
  let result;
  try {
    result = (await osascript.execAsync('id of app "Simulator"')).trim();
  } catch (e) {
    console.error("Can't determine id of Simulator app; the Simulator is most likely not installed on this machine", e);
    return false;
  }
  if (result === 'com.apple.iphonesimulator') {
    return true;
  } else {
    console.warn("Simulator is installed but is identified as '" + result + "'; don't know what that is.");
    return false;
  }
}

// Simulator opened
async function _openSimulatorAsync() {
  return await spawnAsync('open', ['-a', 'Simulator']);
}

async function _isSimulatorRunningAsync() {
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
  let infoJson = await execAsync('xcrun', ['simctl', 'list', 'devices', '--json']);
  let info = JSON.parse(infoJson);
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

function _dirForSimulatorDevice(udid) {
  return path.resolve(homeDir(), 'Library/Developer/CoreSimulator/Devices', udid);
}

async function _quitSimulatorAsync() {
  return await osascript.execAsync('tell application "Simulator" to quit');
}

// Exponent installed
async function _isExponentAppInstalledOnCurrentBootedSimulatorAsync() {
  let device = await _bootedSimulatorDeviceAsync();
  if (!device) {
    return false;
  }
  let simDir = await _dirForSimulatorDevice(device.udid);
  let matches = await glob.promise('./data/Containers/Data/Application/*/Library/Caches/Snapshots/host.exp.Exponent', {cwd: simDir});

  return (matches.length > 0);
}

async function _waitForExponentAppInstalledOnCurrentBootedSimulatorAsync() {
  if (await _isExponentAppInstalledOnCurrentBootedSimulatorAsync()) {
    return true;
  } else {
    await delayAsync(100);
    return await _waitForExponentAppInstalledOnCurrentBootedSimulatorAsync();
  }
}

async function _exponentVersionOnCurrentBootedSimulatorAsync() {
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

async function _checkExponentUpToDateAsync() {
  let versions = await Api.versionsAsync();
  let installedVersion = await _exponentVersionOnCurrentBootedSimulatorAsync();

  if (!installedVersion || installedVersion !== versions.iosVersion) {
    Logger.notifications.warn({code: NotificationCode.OLD_IOS_APP_VERSION}, 'This version of the Exponent app is out of date. Uninstall the app and run again to upgrade.');
  }
}

async function _downloadSimulatorAppAsync() {
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

async function _installExponentOnSimulatorAsync() {
  Logger.global.info(`Downloading latest version of Exponent`);
  Logger.notifications.info({code: NotificationCode.START_LOADING});
  let dir = await _downloadSimulatorAppAsync();
  Logger.global.info("Installing Exponent on iOS simulator");
  let result = await spawnAsync('xcrun', ['simctl', 'install', 'booted', dir]);
  Logger.notifications.info({code: NotificationCode.STOP_LOADING});
  return result;
}

async function _uninstallExponentAppFromSimulatorAsync() {
  try {
    Logger.global.info('Uninstalling Exponent from iOS simulator.');
    await execAsync('xcrun', ['simctl', 'uninstall', 'booted', 'host.exp.Exponent']);
  } catch (e) {
    if (e.message === 'Command failed: xcrun simctl uninstall booted host.exp.Exponent\nNo devices are booted.\n') {
      return null;
    } else {
      console.error(e);
      throw e;
    }
  }
}

function _simulatorCacheDirectory() {
  let dotExponentHomeDirectory = UserSettings.dotExponentHomeDirectory();
  let dir = path.join(dotExponentHomeDirectory, 'ios-simulator-app-cache');
  mkdirp.sync(dir);
  return dir;
}

async function upgradeExponentOnSimulatorAsync() {
  await _uninstallExponentAppFromSimulatorAsync();
  await _installExponentOnSimulatorAsync();

  if (_lastUrl) {
    Logger.global.info(`Opening ${_lastUrl} in Exponent.`);
    await spawnAsync('xcrun', ['simctl', 'openurl', 'booted', _lastUrl]);
    _lastUrl = null;
  }
}

// Open Url
async function _openUrlInSimulatorAsync(url) {
  _lastUrl = url;
  _checkExponentUpToDateAsync(); // let this run in background
  return await spawnAsync('xcrun', ['simctl', 'openurl', 'booted', url]);
}

async function _tryOpeningSimulatorInstallingExponentAndOpeningLinkAsync(url) {
  if (!(await _isSimulatorRunningAsync())) {
    Logger.global.info("Opening iOS simulator");
    await _openSimulatorAsync();
    await _waitForSimulatorRunningAsync();
  }

  if (!(await _isExponentAppInstalledOnCurrentBootedSimulatorAsync())) {
    await _installExponentOnSimulatorAsync();
    await _waitForExponentAppInstalledOnCurrentBootedSimulatorAsync();
  }

  Logger.global.info(`Opening ${url} in iOS simulator`);
  await _openUrlInSimulatorAsync(url);
}

async function openUrlInSimulatorSafeAsync(url) {
  if (!(await _isSimulatorInstalledAsync())) {
    Logger.global.error("Simulator not installed. Please visit https://developer.apple.com/xcode/download/ to download Xcode and the iOS simulator");
    return;
  }

  try {
    await _tryOpeningSimulatorInstallingExponentAndOpeningLinkAsync(url);
  } catch (e) {
    Logger.global.error('Error running app. Uninstalling exponent and trying again.');

    try {
      await _uninstallExponentAppFromSimulatorAsync();
    } catch (uninstallError) {}

    await _tryOpeningSimulatorInstallingExponentAndOpeningLinkAsync(url);
  }
}

module.exports = {
  openUrlInSimulatorSafeAsync,
  upgradeExponentOnSimulatorAsync,

  // Used by tests
  _installExponentOnSimulatorAsync,
  _isExponentAppInstalledOnCurrentBootedSimulatorAsync,
  _isSimulatorInstalledAsync,
  _isSimulatorRunningAsync,
  _openSimulatorAsync,
  _openUrlInSimulatorAsync,
  _quitSimulatorAsync,
  _uninstallExponentAppFromSimulatorAsync,
};
