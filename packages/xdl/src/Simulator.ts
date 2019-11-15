import * as ConfigUtils from '@expo/config';
import * as osascript from '@expo/osascript';
import spawnAsync from '@expo/spawn-async';
import delayAsync from 'delay-async';
import fs from 'fs-extra';
import glob from 'glob-promise';
import os from 'os';
import path from 'path';
import semver from 'semver';

import * as Analytics from './Analytics';
import Api from './Api';
import Logger from './Logger';
import NotificationCode from './NotificationCode';
import * as UrlUtils from './UrlUtils';
import UserSettings from './UserSettings';
import * as Versions from './Versions';
import { getUrlAsync as getWebpackUrlAsync } from './Webpack';
import XDLError from './XDLError';

let _lastUrl: string | null = null;

const SUGGESTED_XCODE_VERSION = `8.2.0`;
const XCODE_NOT_INSTALLED_ERROR =
  'Simulator not installed. Please visit https://developer.apple.com/xcode/download/ to download Xcode and the iOS simulator. If you already have the latest version of Xcode installed, you may have to run the command `sudo xcode-select -s /Applications/Xcode.app`.';

export function isPlatformSupported() {
  return process.platform === 'darwin';
}

function _isLicenseOutOfDate(text: string) {
  if (!text) {
    return false;
  }

  let lower = text.toLowerCase();
  return lower.includes('xcode') && lower.includes('license');
}

async function _xcrunAsync(args: string[]) {
  try {
    return await spawnAsync('xcrun', args);
  } catch (e) {
    if (_isLicenseOutOfDate(e.stdout) || _isLicenseOutOfDate(e.stderr)) {
      throw new XDLError(
        'XCODE_LICENSE_NOT_ACCEPTED',
        'Xcode license is not accepted. Please run `sudo xcodebuild -license`.'
      );
    } else {
      Logger.global.error(`Error running \`xcrun ${args.join(' ')}\`: ${e.stderr}`);
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
    console.error(
      "Can't determine id of Simulator app; the Simulator is most likely not installed on this machine",
      e
    );
    Logger.global.error(XCODE_NOT_INSTALLED_ERROR);
    return false;
  }
  if (
    result !== 'com.apple.iphonesimulator' &&
    result !== 'com.apple.CoreSimulator.SimulatorTrampoline'
  ) {
    console.warn(
      "Simulator is installed but is identified as '" + result + "'; don't know what that is."
    );
    Logger.global.error(XCODE_NOT_INSTALLED_ERROR);
    return false;
  }

  // check xcode version
  try {
    const { stdout } = await spawnAsync('xcodebuild', ['-version']);

    // find something that looks like a dot separated version number
    let matches = stdout.match(/[\d]{1,2}\.[\d]{1,3}/);
    if (!matches) {
      // very unlikely
      console.error('No version number found from `xcodebuild -version`.');
      Logger.global.error(
        'Unable to check Xcode version. Command ran successfully but no version number was found.'
      );
      return false;
    }

    // we're cheating to use the semver lib, but it expects a proper patch version which xcode doesn't have
    const version = matches[0] + '.0';

    if (!semver.valid(version)) {
      console.error('Invalid version number found: ' + matches[0]);
      return false;
    }

    if (semver.lt(version, SUGGESTED_XCODE_VERSION)) {
      console.warn(
        `Found Xcode ${version}, which is older than the recommended Xcode ${SUGGESTED_XCODE_VERSION}.`
      );
    }
  } catch (e) {
    // how would this happen? presumably if Simulator id is found then xcodebuild is installed
    console.error(`Unable to check Xcode version: ${e}`);
    Logger.global.error(XCODE_NOT_INSTALLED_ERROR);
    return false;
  }

  // make sure we can run simctl
  try {
    await _xcrunAsync(['simctl', 'help']);
  } catch (e) {
    if (e.isXDLError) {
      Logger.global.error(e.toString());
    } else {
      console.warn(`Unable to run simctl: ${e.toString()}`);
      Logger.global.error(
        'xcrun may not be configured correctly. Try running `sudo xcode-select --reset` and running this again.'
      );
    }
    return false;
  }

  return true;
}

// Simulator opened
export async function _openAndBootSimulatorAsync() {
  if (!await _isSimulatorRunningAsync()) {
    Logger.global.info('Opening iOS simulator');
    await spawnAsync('open', ['-a', 'Simulator']);
    await _waitForDeviceToBoot();
  } else {
    let bootedDevice = await _bootedSimulatorDeviceAsync();
    if (!bootedDevice) {
      await _bootDefaultSimulatorDeviceAsync();
    }
  }
}

export async function _isSimulatorRunningAsync() {
  let zeroMeansNo = (await osascript.execAsync(
    'tell app "System Events" to count processes whose name is "Simulator"'
  )).trim();
  if (zeroMeansNo === '0') {
    return false;
  }

  return true;
}

async function _bootDefaultSimulatorDeviceAsync() {
  Logger.global.info(`Booting device in iOS simulator...`);
  try {
    let deviceUDID = await _getDefaultSimulatorDeviceUDIDAsync();
    if (!deviceUDID) {
      deviceUDID = (await _getFirstAvailableDeviceAsync()).udid;
    }
    return await _xcrunAsync(['simctl', 'boot', deviceUDID]);
  } catch (e) {
    Logger.global.error(
      `There was a problem booting a device in iOS Simulator. Quit Simulator, and try again.`
    );
    throw e;
  }
}

async function _getDefaultSimulatorDeviceUDIDAsync() {
  try {
    const { stdout: defaultDeviceUDID } = await spawnAsync('defaults', [
      'read',
      'com.apple.iphonesimulator',
      'CurrentDeviceUDID',
    ]);
    return defaultDeviceUDID.trim();
  } catch (e) {
    return null;
  }
}

async function _getFirstAvailableDeviceAsync() {
  const simulatorDeviceInfo = (await _listSimulatorDevicesAsync()).devices;
  let iOSRuntimesNewestToOldest = Object.keys(simulatorDeviceInfo)
    .filter(runtime => runtime.includes('iOS'))
    .reverse();

  const devices = simulatorDeviceInfo[iOSRuntimesNewestToOldest[0]];
  for (let i = 0; i < devices.length; i++) {
    const device = devices[i];
    if (device.isAvailable && device.name.includes('iPhone')) {
      return device;
    }
  }
  throw new Error('No iPhone devices available in Simulator.');
}

type SimulatorDevice = {
  availability: string;
  state: string;
  isAvailable: boolean;
  name: string;
  udid: string;
  availabilityError: string;
};
type SimulatorDeviceList = {
  devices: {
    [runtime: string]: SimulatorDevice[];
  };
};

async function _listSimulatorDevicesAsync() {
  const result = await _xcrunAsync(['simctl', 'list', 'devices', '--json']);
  const info = JSON.parse(result.stdout) as SimulatorDeviceList;
  return info;
}

async function _waitForDeviceToBoot() {
  let bootedDevice;
  const start = Date.now();
  do {
    await delayAsync(100);
    bootedDevice = await _bootedSimulatorDeviceAsync();
    if (Date.now() - start > 10000) {
      Logger.global.error(
        `iOS Simulator device failed to boot. Try opening Simulator first, then running your app.`
      );
      throw new Error('Timed out waiting for iOS Simulator device to boot.');
    }
  } while (!bootedDevice);
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
  return path.resolve(os.homedir(), 'Library/Developer/CoreSimulator/Devices', udid);
}

export async function _quitSimulatorAsync() {
  return await osascript.execAsync('tell application "Simulator" to quit');
}

// Expo installed
export async function _isExpoAppInstalledOnCurrentBootedSimulatorAsync() {
  let device = await _bootedSimulatorDeviceAsync();
  if (!device) {
    return false;
  }
  let simDir = await _dirForSimulatorDevice(device.udid);
  let matches = await glob(
    './data/Containers/Data/Application/**/Snapshots/host.exp.Exponent{,**}',
    { cwd: simDir }
  );

  return matches.length > 0;
}

export async function _waitForExpoAppInstalledOnCurrentBootedSimulatorAsync(): Promise<boolean> {
  if (await _isExpoAppInstalledOnCurrentBootedSimulatorAsync()) {
    return true;
  } else {
    await delayAsync(100);
    return await _waitForExpoAppInstalledOnCurrentBootedSimulatorAsync();
  }
}

export async function _expoVersionOnCurrentBootedSimulatorAsync() {
  let device = await _bootedSimulatorDeviceAsync();
  if (!device) {
    return null;
  }
  let simDir = await _dirForSimulatorDevice(device.udid);
  let matches = await glob('./data/Containers/Bundle/Application/*/Exponent-*.app', {
    cwd: simDir,
  });

  if (matches.length === 0) {
    return null;
  }

  let regex = /Exponent-([0-9.]+)\.app/;
  let regexMatch = regex.exec(matches[0]);
  if (!regexMatch) {
    return null;
  }

  return regexMatch[1];
}

export async function _checkExpoUpToDateAsync() {
  let versions = await Versions.versionsAsync();
  let installedVersion = await _expoVersionOnCurrentBootedSimulatorAsync();

  if (!installedVersion || semver.lt(installedVersion, versions.iosVersion)) {
    Logger.notifications.warn(
      { code: NotificationCode.OLD_IOS_APP_VERSION },
      'This version of the Expo app is out of date. Uninstall the app and run again to upgrade.'
    );
  }
}

export async function _downloadSimulatorAppAsync(url?: string) {
  // If specific URL given just always download it and don't use cache
  if (url) {
    let dir = path.join(_simulatorCacheDirectory(), `Exponent-tmp.app`);
    await Api.downloadAsync(url, dir, { extract: true });
    return dir;
  }

  let versions = await Versions.versionsAsync();
  let dir = path.join(_simulatorCacheDirectory(), `Exponent-${versions.iosVersion}.app`);

  if (await fs.pathExists(dir)) {
    let filesInDir = await fs.readdir(dir);
    if (filesInDir.length > 0) {
      return dir;
    } else {
      fs.removeSync(dir);
    }
  }

  fs.mkdirpSync(dir);
  try {
    await Api.downloadAsync(versions.iosUrl, dir, { extract: true });
  } catch (e) {
    fs.removeSync(dir);
    throw e;
  }

  return dir;
}

// url: Optional URL of Exponent.app tarball to download
export async function _installExpoOnSimulatorAsync(url?: string) {
  Logger.global.info(`Downloading the latest version of Expo client app`);
  Logger.notifications.info({ code: NotificationCode.START_LOADING });
  let dir = await _downloadSimulatorAppAsync(url);
  Logger.notifications.info({ code: NotificationCode.STOP_LOADING });
  Logger.global.info('Installing Expo client on iOS simulator');
  Logger.notifications.info({ code: NotificationCode.START_LOADING });
  let result = await _xcrunAsync(['simctl', 'install', 'booted', dir]);
  Logger.notifications.info({ code: NotificationCode.STOP_LOADING });
  return result;
}

export async function _uninstallExpoAppFromSimulatorAsync() {
  try {
    Logger.global.info('Uninstalling Expo client from iOS simulator.');
    await _xcrunAsync(['simctl', 'uninstall', 'booted', 'host.exp.Exponent']);
  } catch (e) {
    if (e.message && e.message.includes('No devices are booted.')) {
      return;
    } else {
      console.error(e);
      throw e;
    }
  }
}

export function _simulatorCacheDirectory() {
  let dotExpoHomeDirectory = UserSettings.dotExpoHomeDirectory();
  let dir = path.join(dotExpoHomeDirectory, 'ios-simulator-app-cache');
  fs.mkdirpSync(dir);
  return dir;
}

export async function upgradeExpoAsync(): Promise<boolean> {
  if (!await _isSimulatorInstalledAsync()) {
    return false;
  }

  await _openAndBootSimulatorAsync();
  await _uninstallExpoAppFromSimulatorAsync();
  let installResult = await _installExpoOnSimulatorAsync();
  if (installResult.status !== 0) {
    return false;
  }

  if (_lastUrl) {
    Logger.global.info(`Opening ${_lastUrl} in Expo.`);
    await _xcrunAsync(['simctl', 'openurl', 'booted', _lastUrl]);
    _lastUrl = null;
  }

  return true;
}

// Open Url
export async function _openUrlInSimulatorAsync(url: string) {
  return await _xcrunAsync(['simctl', 'openurl', 'booted', url]);
}

export async function openUrlInSimulatorSafeAsync(
  url: string,
  isDetached: boolean = false
): Promise<{ success: true } | { success: false; msg: string }> {
  if (!await _isSimulatorInstalledAsync()) {
    return {
      success: false,
      msg: 'Unable to verify Xcode and Simulator installation.',
    };
  }

  try {
    await _openAndBootSimulatorAsync();

    if (!isDetached && !await _isExpoAppInstalledOnCurrentBootedSimulatorAsync()) {
      await _installExpoOnSimulatorAsync();
      await _waitForExpoAppInstalledOnCurrentBootedSimulatorAsync();
    }

    if (!isDetached) {
      _lastUrl = url;
      _checkExpoUpToDateAsync(); // let this run in background
    }

    Logger.global.info(`Opening ${url} in iOS simulator`);
    await _openUrlInSimulatorAsync(url);
  } catch (e) {
    if (e.isXDLError) {
      // Hit some internal error, don't try again.
      // This includes Xcode license errors
      Logger.global.error(e.message);
      return {
        success: false,
        msg: `${e.toString()}`,
      };
    }

    if (isDetached) {
      Logger.global.error(
        `Error running app. Have you installed the app already using Xcode? Since you are detached you must build manually. ${e.toString()}`
      );
    } else {
      Logger.global.error(`Error installing or running app. ${e.toString()}`);
    }

    return {
      success: false,
      msg: `${e.toString()}`,
    };
  }

  Analytics.logEvent('Open Url on Device', {
    platform: 'ios',
  });

  return {
    success: true,
  };
}

export async function openProjectAsync(
  projectRoot: string
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  let projectUrl = await UrlUtils.constructManifestUrlAsync(projectRoot, {
    hostType: 'localhost',
  });

  let { exp } = await ConfigUtils.readConfigJsonAsync(projectRoot, {
    skipSDKVersionRequirement: true,
  });

  let result = await openUrlInSimulatorSafeAsync(projectUrl, !!exp.isDetached);
  if (result.success) {
    return { success: true, url: projectUrl };
  } else {
    return { success: result.success, error: result.msg };
  }
}

export async function openWebProjectAsync(
  projectRoot: string
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const projectUrl = await getWebpackUrlAsync(projectRoot);
  if (projectUrl === null) {
    return {
      success: false,
      error: `The web project has not been started yet`,
    };
  }
  const result = await openUrlInSimulatorSafeAsync(projectUrl, true);
  if (result.success) {
    return { success: true, url: projectUrl };
  } else {
    return { success: result.success, error: result.msg };
  }
}
