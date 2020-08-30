import * as osascript from '@expo/osascript';
import spawnAsync, { SpawnOptions } from '@expo/spawn-async';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';

import Logger from './Logger';
import UserSettings from './UserSettings';
import XDLError from './XDLError';

type DeviceState = 'Shutdown' | 'Booted';

export type Device = {
  availabilityError: 'runtime profile not found';
  /**
   * '/Users/name/Library/Developer/CoreSimulator/Devices/00E55DC0-0364-49DF-9EC6-77BE587137D4/data'
   */
  dataPath: string;
  /**
   * '/Users/name/Library/Logs/CoreSimulator/00E55DC0-0364-49DF-9EC6-77BE587137D4'
   */
  logPath: string;
  /**
   * '00E55DC0-0364-49DF-9EC6-77BE587137D4'
   */
  udid: string;
  /**
   * com.apple.CoreSimulator.SimRuntime.tvOS-13-4
   */
  runtime: string;
  isAvailable: boolean;
  /**
   * 'com.apple.CoreSimulator.SimDeviceType.Apple-TV-1080p'
   */
  deviceTypeIdentifier: string;
  state: DeviceState;
  /**
   * 'Apple TV'
   */
  name: string;

  osType: OSType;
  /**
   * '13.4'
   */
  osVersion: string;
  /**
   * 'iPhone 11 (13.6)'
   */
  windowName: string;
};

type OSType = 'iOS' | 'tvOS' | 'watchOS';

type PermissionName =
  | 'all'
  | 'calendar'
  | 'contacts-limited'
  | 'contacts'
  | 'location'
  | 'location-always'
  | 'photos-add'
  | 'photos'
  | 'media-library'
  | 'microphone'
  | 'motion'
  | 'reminders'
  | 'siri';

type SimulatorDeviceList = {
  devices: {
    [runtime: string]: Device[];
  };
};

export async function isSimulatorRunningAsync() {
  const zeroMeansNo = (
    await osascript.execAsync(
      'tell app "System Events" to count processes whose name is "Simulator"'
    )
  ).trim();
  if (zeroMeansNo === '0') {
    return false;
  }

  return true;
}

export async function getDefaultSimulatorDeviceUDIDAsync() {
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

export function dirForSimulatorDevice(udid: string) {
  return path.resolve(os.homedir(), 'Library/Developer/CoreSimulator/Devices', udid);
}

export async function quitSimulatorAsync() {
  return await osascript.execAsync('tell application "Simulator" to quit');
}

export function simulatorCacheDirectory() {
  const dotExpoHomeDirectory = UserSettings.dotExpoHomeDirectory();
  const dir = path.join(dotExpoHomeDirectory, 'ios-simulator-app-cache');
  fs.mkdirpSync(dir);
  return dir;
}

export async function existsAsync(udid: string, bundleIdentifier: string): Promise<boolean> {
  try {
    await simctlAsync(['get_app_container', deviceUDIDOrBooted(udid), bundleIdentifier]);
    return true;
  } catch {
    return false;
  }
}

export async function openURLAsync(options: { udid?: string; url: string }) {
  return simctlAsync(['openurl', deviceUDIDOrBooted(options.udid), options.url]);
}

// This will only boot in headless mode if the Simulator app is not running.
export async function bootAsync({ udid }: { udid: string }): Promise<Device | null> {
  try {
    // Skip logging since this is likely to fail.
    await xcrunAsync(['simctl', 'boot', udid]);
  } catch (error) {
    // Silly errors
    if (!error.stderr?.match(/Unable to boot device in current state: Booted/)) {
      throw error;
    }
  }
  return await isSimulatorBootedAsync({ udid });
}

export async function getBootedSimulatorsAsync(): Promise<Device[]> {
  const simulatorDeviceInfo = await listAsync('devices');
  return Object.values(simulatorDeviceInfo.devices).reduce((prev, runtime) => {
    return prev.concat(runtime.filter(device => device.state === 'Booted'));
  }, []);
}

export async function isSimulatorBootedAsync({ udid }: { udid?: string }): Promise<Device | null> {
  // Simulators can be booted even if the app isn't running :(
  const devices = await getBootedSimulatorsAsync();
  if (udid) {
    return devices.find(bootedDevice => bootedDevice.udid === udid) ?? null;
  } else {
    return devices[0] ?? null;
  }
}

export async function installAsync(options: { udid: string; dir: string }): Promise<any> {
  return simctlAsync(['install', deviceUDIDOrBooted(options.udid), options.dir]);
}
export async function uninstallAsync(options: {
  udid?: string;
  bundleIdentifier: string;
}): Promise<any> {
  return simctlAsync(['uninstall', deviceUDIDOrBooted(options.udid), options.bundleIdentifier]);
}

// TODO: Compare with
// const results = await SimControl.xcrunAsync(['instruments', '-s']);
export async function listAsync(
  type: 'devices' | 'devicetypes' | 'runtimes' | 'pairs',
  query?: string | 'available'
): Promise<SimulatorDeviceList> {
  const result = await simctlAsync(['list', type, '--json', query]);
  const info = JSON.parse(result.stdout) as SimulatorDeviceList;

  for (const runtime of Object.keys(info.devices)) {
    // Given a string like 'com.apple.CoreSimulator.SimRuntime.tvOS-13-4'
    const runtimeSuffix = runtime.split('com.apple.CoreSimulator.SimRuntime.').pop()!;
    // Create an array [tvOS, 13, 4]
    const [osType, ...osVersionComponents] = runtimeSuffix.split('-');
    // Join the end components [13, 4] -> '13.4'
    const osVersion = osVersionComponents.join('.');
    const sims = info.devices[runtime];
    for (const device of sims) {
      device.runtime = runtime;
      device.osVersion = osVersion;
      device.windowName = `${device.name} (${osVersion})`;
      device.osType = osType as OSType;
    }
  }
  return info;
}

export async function shutdownAsync(udid?: string) {
  try {
    return simctlAsync(['shutdown', deviceUDIDOrBooted(udid)]);
  } catch (e) {
    if (!e.message?.includes('No devices are booted.')) {
      throw e;
    }
  }
}

// Some permission changes will terminate the application if running
export async function updatePermissionsAsync(
  udid: string,
  action: 'grant' | 'revoke' | 'reset',
  permission: PermissionName,
  bundleIdentifier?: string
) {
  return simctlAsync(['privacy', deviceUDIDOrBooted(udid), action, permission, bundleIdentifier]);
}

export async function setAppearanceAsync(udid: string, theme: 'light' | 'dark') {
  return simctlAsync(['ui', deviceUDIDOrBooted(udid), theme]);
}

// Cannot be invoked unless the simulator is `shutdown`
export async function eraseAsync(udid: string) {
  return simctlAsync(['erase', deviceUDIDOrBooted(udid)]);
}

export async function eraseAllAsync() {
  return simctlAsync(['erase', 'all']);
}

export function directoryForDevice(udid: string): string {
  return path.resolve(os.homedir(), 'Library/Developer/CoreSimulator/Devices', udid);
}

// Add photos and videos to the simulator's gallery
export async function addMediaAsync(udid: string, mediaPath: string) {
  return simctlAsync(['addmedia', deviceUDIDOrBooted(udid), mediaPath]);
}

export async function captureScreenAsync(
  udid: string,
  captureType: 'screenshot' | 'recordVideo',
  outputFilePath: string
) {
  return simctlAsync([
    'io',
    deviceUDIDOrBooted(udid),
    captureType,
    `—type=${path.extname(outputFilePath)}`,
    outputFilePath,
  ]);
}

// Clear all unused simulators
export async function deleteUnavailableAsync() {
  return simctlAsync(['delete', 'unavailable']);
}

export async function simctlAsync(
  [command, ...args]: (string | undefined)[],
  options?: SpawnOptions
) {
  return xcrunWithLogging(
    // @ts-ignore
    ['simctl', command, ...args.filter(Boolean)],
    options
  );
}

function deviceUDIDOrBooted(udid?: string): string {
  return udid ? udid : 'booted';
}

/**
 * I think the app can be open while no simulators are booted.
 */
export async function isSimulatorAppRunningAsync(): Promise<boolean> {
  const zeroMeansNo = (
    await osascript.execAsync(
      'tell app "System Events" to count processes whose name is "Simulator"'
    )
  ).trim();
  if (zeroMeansNo === '0') {
    return false;
  }

  return true;
}

export async function openSimulatorAppAsync({ udid }: { udid?: string }) {
  const args = ['-a', 'Simulator'];
  if (udid) {
    // This has no effect if the app is already running.
    args.push('--args', '-CurrentDeviceUDID', udid);
  }
  return await spawnAsync('open', args);
}

export async function killAllAsync() {
  return await spawnAsync('killAll', ['Simulator']);
}

export function isLicenseOutOfDate(text: string) {
  if (!text) {
    return false;
  }

  const lower = text.toLowerCase();
  return lower.includes('xcode') && lower.includes('license');
}

export async function xcrunAsync(args: string[], options?: SpawnOptions) {
  try {
    return await spawnAsync('xcrun', args, options);
  } catch (e) {
    if (isLicenseOutOfDate(e.stdout) || isLicenseOutOfDate(e.stderr)) {
      throw new XDLError(
        'XCODE_LICENSE_NOT_ACCEPTED',
        'Xcode license is not accepted. Please run `sudo xcodebuild -license`.'
      );
    }
    throw e;
  }
}
export async function xcrunWithLogging(args: string[], options?: SpawnOptions) {
  try {
    return await xcrunAsync(args, options);
  } catch (e) {
    Logger.global.error(`Error running \`xcrun ${args.join(' ')}\`: ${e.stderr}`);
    throw e;
  }
}
