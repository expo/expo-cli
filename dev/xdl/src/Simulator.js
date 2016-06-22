import 'instapromise';

import delayAsync from 'delay-async';
import download from 'download';
import execAsync from 'exec-async';
import existsAsync from 'exists-async';
import fs from 'fs';
import glob from 'glob';
import homeDir from 'home-dir';
import http from 'http';
import md5hex from 'md5hex';
import osascript from '@exponent/osascript';
import path from 'path';
import spawnAsync from '@exponent/spawn-async';

import Api from './Api';
import Metadata from './Metadata';
import UserSettings from './UserSettings';

async function isSimulatorInstalledAsync() {
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

async function openSimulatorAsync() {
  return await spawnAsync('open', ['-a', 'Simulator']);
}

async function installAppOnSimulatorAsync(pathToApp) {
  return await spawnAsync('xcrun', ['simctl', 'install', 'booted', pathToApp]);
}

async function isSimulatorRunningAsync() {
  let zeroMeansNo = (await osascript.execAsync('tell app "System Events" to count processes whose name is "Simulator"')).trim();
  // console.log("zeroMeansNo=", zeroMeansNo);
  return (zeroMeansNo !== '0');
}

async function listSimulatorDevicesAsync() {
  let infoJson = await execAsync('xcrun', ['simctl', 'list', 'devices', '--json']);
  let info = JSON.parse(infoJson);
  return info;
}

async function bootedSimulatorDeviceAsync() {
  let simulatorDeviceInfo = await listSimulatorDevicesAsync();
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

function dirForSimulatorDevice(udid) {
  return path.resolve(homeDir(), 'Library/Developer/CoreSimulator/Devices', udid);
}

async function isExponentAppInstalledOnCurrentBootedSimulatorAsync() {
  let device = await bootedSimulatorDeviceAsync();
  if (!device) {
    return false;
  }
  let simDir = await dirForSimulatorDevice(device.udid);
  let matches = await glob.promise('./data/Containers/Data/Application/*/Library/Caches/Snapshots/host.exp.Exponent', {cwd: simDir});
  return (matches.length > 0);
}

async function pathToExponentSimulatorAppAsync() {
  let versionInfo = await Metadata.reactNativeVersionInfoAsync();
  let versionPair = [versionInfo.versionDescription, versionInfo.versionSpecific];
  return await simulatorAppForReactNativeVersionAsync(versionPair)
}

async function installExponentOnSimulatorAsync() {
  let exponentAppPath = await pathToExponentSimulatorAppAsync();
  return await installAppOnSimulatorAsync(exponentAppPath);
}

async function openUrlInSimulatorAsync(url) {
  return await spawnAsync('xcrun', ['simctl', 'openurl', 'booted', url]);
}

async function openUrlInSimulatorSafeAsync(url, log, error, startLoading, stopLoading) {
  if (!(await isSimulatorInstalledAsync())) {
    error("Simulator not installed. Please visit https://developer.apple.com/xcode/download/ to download Xcode and the iOS simulator");
    return;
  }

  if (!(await isSimulatorRunningAsync())) {
    log("Opening iOS simulator");
    if (startLoading) { startLoading(); }
    await openSimulatorAsync();
    // TODO: figure out a better way to do this
    await delayAsync(5000);
    if (stopLoading) { stopLoading(); }
  }

  if (!(await isExponentAppInstalledOnCurrentBootedSimulatorAsync())) {
    log("Installing Exponent on iOS simulator");
    if (startLoading) { startLoading(); }
    await installExponentOnSimulatorAsync();
    // TODO: figure out a better way to do this
    await delayAsync(1000);
    if (stopLoading) { stopLoading(); }
  }

  log(`Opening ${url} in iOS simulator`);
  await openUrlInSimulatorAsync(url);
}

async function simulatorAppForReactNativeVersionAsync(versionPair) {
  // Will download -- if necessary -- and then return the path to the simulator

  let p = simulatorAppPathForReactNativeVersion(versionPair);
  if (await existsAsync(p)) {
    return p;
  } else {
    console.log("No simulator app for react-native version " + versionPair + " so downloading now");

    let response = await Api.callMethodAsync('simulator.urlForSimulatorAppForReactNativeVersion', []);
    let remoteUrl = response.result;

    console.log("Downloading simulator app from " + remoteUrl);
    // remoteUrl = 'https://s3.amazonaws.com/exp-us-standard/xde/SimulatorApps/1.0/Exponent.app.zip'

    let dir = simulatorAppDirectoryForReactNativeVersion(versionPair);
    let d$ = new download({extract: true}).get(remoteUrl).dest(dir).promise.run();
    await d$;
    return p;
  }
}

async function uninstallExponentAppFromSimulatorAsync() {
  try {
    let result = await execAsync('xcrun', ['simctl', 'uninstall', 'booted', 'host.exp.Exponent']);
    return true;
  } catch (e) {
    if (e.message === 'Command failed: xcrun simctl uninstall booted host.exp.Exponent\nNo devices are booted.\n') {
      return null;
    } else {
      console.error(e);
      throw e;
    }
  }
}

async function quitSimulatorAsync() {
  return await osascript.execAsync('tell application "Simulator" to quit');
}

function simulatorCacheDirectory() {
  let dotExponentHomeDirectory = UserSettings._dotExponentHomeDirectory();
  return path.join(dotExponentHomeDirectory, 'simulator-app-cache');
}

function _escapeForFilesystem(s) {
  let sStripped = s.replace(/[^0-9a-zA-Z]/g, '');
  let full = sStripped + '-' + md5hex(s, 8);
  // console.log("full=", full);
  return full;
}

function _strip(s) {
  return s.replace(/[^0-9a-zA-Z]/g, '');
}

function _escapeForFilesystem(list) {
  let hash = md5hex(JSON.stringify(list), 8);
  return list.map(_strip).join('.') + '-' + hash;
}

function simulatorAppPathForReactNativeVersion(versionPair) {
  // For now, something seems broken about downloading over the Internet, so
  // we'll just copy the Simulator app into this bundle
  return path.resolve(__dirname, '../simulator-app/1.5.0/Exponent.app');
  return path.join(simulatorAppDirectoryForReactNativeVersion(versionPair), 'Exponent.app');
}


function simulatorAppDirectoryForReactNativeVersion(versionPair) {
  // console.log("version=", version);
  return path.join(simulatorCacheDirectory(), _escapeForFilesystem(versionPair));
}

module.exports = {
  _escapeForFilesystem,
  bootedSimulatorDeviceAsync,
  dirForSimulatorDevice,
  listSimulatorDevicesAsync,
  installExponentOnSimulatorAsync,
  isExponentAppInstalledOnCurrentBootedSimulatorAsync,
  isSimulatorInstalledAsync,
  isSimulatorRunningAsync,
  openSimulatorAsync,
  openUrlInSimulatorAsync,
  openUrlInSimulatorSafeAsync,
  pathToExponentSimulatorAppAsync,
  quitSimulatorAsync,
  simulatorCacheDirectory,
  simulatorAppForReactNativeVersionAsync,
  uninstallExponentAppFromSimulatorAsync,
};
