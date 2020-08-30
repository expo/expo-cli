import { getConfig } from '@expo/config';
import * as osascript from '@expo/osascript';
import spawnAsync from '@expo/spawn-async';
import chalk from 'chalk';
import delayAsync from 'delay-async';
import fs from 'fs-extra';
import { sync as globSync } from 'glob';
import { Separator, prompt } from 'inquirer';
import path from 'path';
import ProgressBar from 'progress';
import semver from 'semver';

import * as Analytics from './Analytics';
import Api from './Api';
import Logger from './Logger';
import NotificationCode from './NotificationCode';
import * as SimControl from './SimControl';
import * as UrlUtils from './UrlUtils';
import UserSettings from './UserSettings';
import * as Versions from './Versions';
import { getUrlAsync as getWebpackUrlAsync } from './Webpack';

let _lastUrl: string | null = null;
let _lastUdid: string | null = null;

const SUGGESTED_XCODE_VERSION = `8.2.0`;
const XCODE_NOT_INSTALLED_ERROR =
  'Simulator not installed. Please visit https://developer.apple.com/xcode/download/ to download Xcode and the iOS simulator. If you already have the latest version of Xcode installed, you may have to run the command `sudo xcode-select -s /Applications/Xcode.app`.';

const INSTALL_WARNING_TIMEOUT = 60 * 1000;

export function isPlatformSupported() {
  return process.platform === 'darwin';
}

// Simulator installed
export async function isSimulatorInstalledAsync() {
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
    const matches = stdout.match(/[\d]{1,2}\.[\d]{1,3}/);
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
    await SimControl.simctlAsync(['help']);
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

class TimeoutError extends Error {}

/**
 * Ensure a simulator is booted and the Simulator app is opened.
 * This is where any timeout related error handling should live.
 */
export async function ensureSimulatorOpenAsync(
  { udid }: { udid?: string } = {},
  tryAgain: boolean = true
): Promise<SimControl.ListedDevice> {
  // Yes, simulators can be booted even if the app isn't running, obviously we'd never want this.
  if (!(await SimControl.isSimulatorAppRunningAsync())) {
    Logger.global.info(`Opening the iOS simulator, this might take a moment.`);

    // In theory this would ensure the correct simulator is booted as well.
    // This isn't theory though, this is Xcode.
    await SimControl.openSimulatorAppAsync({ udid });
    if (!(await waitForSimulatorAppToStart())) {
      throw new TimeoutError(
        `Simulator app did not open fast enough. Try opening Simulator first, then running your app.`
      );
    }
  }

  // Use a default simulator if none was specified
  if (!udid) {
    const simulatorOpenedByApp = await isSimulatorBootedAsync({ udid });
    // This should prevent opening a second simulator in the chance that default
    // simulator doesn't match what the Simulator app would open by default.
    if (simulatorOpenedByApp?.udid) {
      udid = simulatorOpenedByApp.udid;
    } else {
      udid =
        (await _getDefaultSimulatorDeviceUDIDAsync()) ??
        (await _getFirstAvailableDeviceAsync()).udid;
    }
  }

  const bootedDevice = await waitForDeviceToBootAsync({ udid });

  if (!bootedDevice) {
    // TODO: We should eliminate all needs for a timeout error, it's bad UX to get an error about the simulator not starting while the user can clearly see it starting on their slow computer.
    throw new TimeoutError(
      `Simulator didn't boot fast enough. Try opening Simulator first, then running your app.`
    );
  }
  // TODO: Maybe we can just `isSimulatorBootedAsync`.
  if (tryAgain) {
    return await ensureSimulatorOpenAsync({ udid }, false);
  }
  return bootedDevice;
}

/**
 * Get all simulators supported by Expo (iOS only).
 */
async function getSelectableSimulatorsAsync(): Promise<SimControl.ListedDevice[]> {
  const simulators = await getSimulatorsAsync();
  return simulators.filter(device => device.isAvailable && device.osType === 'iOS');
}

async function getSimulatorsAsync(): Promise<SimControl.ListedDevice[]> {
  const simulatorDeviceInfo = await SimControl.listAsync('devices');
  return Object.values(simulatorDeviceInfo.devices).reduce((prev, runtime) => {
    return prev.concat(runtime);
  }, []);
}

async function getBootedSimulatorsAsync(): Promise<SimControl.ListedDevice[]> {
  const simulators = await getSimulatorsAsync();
  return simulators.filter(device => device.state === 'Booted');
}

export async function isSimulatorBootedAsync({
  udid,
}: {
  udid?: string;
} = {}): Promise<SimControl.ListedDevice | null> {
  // Simulators can be booted even if the app isn't running :(
  const devices = await getBootedSimulatorsAsync();
  if (udid) {
    return devices.find(bootedDevice => bootedDevice.udid === udid) ?? null;
  } else {
    return devices[0] ?? null;
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
  const simulators = await getSelectableSimulatorsAsync();
  if (!simulators.length) {
    // TODO: Prompt to install the simulators
    throw new Error('No iPhone devices available in Simulator.');
  }
  return simulators[0];
}

async function waitForActionAsync<T>({
  action,
  interval = 100,
  maxWaitTime = 20000,
}: {
  action: () => T | Promise<T>;
  interval?: number;
  maxWaitTime?: number;
}): Promise<T> {
  let complete: T;
  const start = Date.now();
  do {
    await delayAsync(interval);

    complete = await action();
    if (Date.now() - start > maxWaitTime) {
      break;
    }
  } while (!complete);

  return complete;
}

async function waitForSimulatorAppToStart(): Promise<boolean> {
  return waitForActionAsync<boolean>({ action: SimControl.isSimulatorAppRunningAsync });
}

async function waitForDeviceToBootAsync({
  udid,
}: Pick<SimControl.ListedDevice, 'udid'>): Promise<SimControl.ListedDevice | null> {
  return waitForActionAsync<SimControl.ListedDevice | null>({
    action: () => {
      return SimControl.bootAsync({ udid });
    },
  });
}

export async function activateSimulatorWindowAsync() {
  // TODO: Focus the individual window
  return await osascript.execAsync(`tell application "Simulator" to activate`);
}

export async function _quitSimulatorAsync() {
  return await osascript.execAsync('tell application "Simulator" to quit');
}

export async function isExpoClientInstalledOnSimulatorAsync({
  udid,
}: {
  udid: string;
}): Promise<boolean> {
  const simDir = await SimControl.directoryForDevice(udid);
  const matches = globSync('data/Containers/Data/Application/**/Snapshots/host.exp.Exponent{,**}', {
    cwd: simDir,
  });
  return matches.length > 0;
}

export async function waitForExpoClientInstalledOnSimulatorAsync({
  udid,
}: {
  udid: string;
}): Promise<boolean> {
  if (await isExpoClientInstalledOnSimulatorAsync({ udid })) {
    return true;
  } else {
    await delayAsync(100);
    return await waitForExpoClientInstalledOnSimulatorAsync({ udid });
  }
}
export async function waitForExpoClientUninstalledOnSimulatorAsync({
  udid,
}: {
  udid: string;
}): Promise<boolean> {
  if (!(await isExpoClientInstalledOnSimulatorAsync({ udid }))) {
    return true;
  } else {
    await delayAsync(100);
    return await waitForExpoClientInstalledOnSimulatorAsync({ udid });
  }
}

export async function expoVersionOnSimulatorAsync({
  udid,
}: {
  udid: string;
}): Promise<string | null> {
  const simDir = await SimControl.directoryForDevice(udid);
  const matches = globSync('data/Containers/Bundle/Application/*/Exponent-*.app', {
    cwd: simDir,
  });

  if (matches.length === 0) {
    return null;
  }

  const regex = /Exponent-([0-9.]+)\.app/;
  const regexMatch = regex.exec(matches[0]);
  if (!regexMatch) {
    return null;
  }

  return regexMatch[1];
}

export async function doesExpoClientNeedUpdatedAsync(
  simulator: Pick<SimControl.ListedDevice, 'udid'>
): Promise<boolean> {
  const versions = await Versions.versionsAsync();

  const installedVersion = await expoVersionOnSimulatorAsync(simulator);
  if (installedVersion && semver.lt(installedVersion, versions.iosVersion)) {
    return true;
  }
  return false;
}

// If specific URL given just always download it and don't use cache
export async function _downloadSimulatorAppAsync(
  url?: string,
  downloadProgressCallback?: (roundedProgress: number) => void
) {
  if (!url) {
    const versions = await Versions.versionsAsync();
    url = versions.iosUrl;
  }

  const filename = path.parse(url).name;
  const dir = path.join(simulatorCacheDirectory(), `${filename}.app`);

  if (await fs.pathExists(dir)) {
    const filesInDir = await fs.readdir(dir);
    if (filesInDir.length > 0) {
      return dir;
    } else {
      fs.removeSync(dir);
    }
  }

  fs.mkdirpSync(dir);
  try {
    await Api.downloadAsync(url, dir, { extract: true }, downloadProgressCallback);
  } catch (e) {
    fs.removeSync(dir);
    throw e;
  }

  return dir;
}

// url: Optional URL of Exponent.app tarball to download
export async function installExpoOnSimulatorAsync({
  url,
  simulator,
}: {
  simulator: Pick<SimControl.ListedDevice, 'name' | 'udid'>;
  url?: string;
}) {
  const bar = new ProgressBar(
    `Installing the Expo client app on ${simulator.name} [:bar] :percent :etas`,
    {
      total: 100,
      width: 64,
      complete: '=',
      incomplete: ' ',
    }
  );

  let warningTimer: NodeJS.Timeout;
  const setWarningTimer = () => {
    if (warningTimer) {
      clearTimeout(warningTimer);
    }
    return setTimeout(() => {
      Logger.global.info('');
      Logger.global.info(
        'This download is taking longer than expected. You can also try downloading the clients from the website at https://expo.io/tools'
      );
    }, INSTALL_WARNING_TIMEOUT);
  };

  Logger.notifications.info({ code: NotificationCode.START_LOADING });
  warningTimer = setWarningTimer();
  const dir = await _downloadSimulatorAppAsync(url, progress => bar.tick(1, progress));
  Logger.notifications.info({ code: NotificationCode.STOP_LOADING });

  Logger.global.info(`Installing Expo client on ${simulator.name}`);
  Logger.notifications.info({ code: NotificationCode.START_LOADING });
  warningTimer = setWarningTimer();

  const result = await SimControl.installAsync({ udid: simulator.udid, dir });
  Logger.notifications.info({ code: NotificationCode.STOP_LOADING });

  clearTimeout(warningTimer);
  return result;
}

export async function uninstallExpoAppFromSimulatorAsync({ udid }: { udid?: string } = {}) {
  try {
    Logger.global.info('Uninstalling Expo client from iOS simulator.');
    await SimControl.uninstallAsync({ udid, bundleIdentifier: 'host.exp.Exponent' });
    // await simctlAsync(['uninstall', deviceUDIDOrBooted(udid), 'host.exp.Exponent']);
  } catch (e) {
    if (!e.message?.includes('No devices are booted.')) {
      console.error(e);
      throw e;
    }
  }
}

export async function shutdownAsync({ udid }: { udid?: string } = {}) {
  try {
    Logger.global.info('Uninstalling Expo client from iOS simulator.');
    await SimControl.shutdownAsync(udid);
  } catch (e) {
    if (!e.message?.includes('No devices are booted.')) {
      console.error(e);
      throw e;
    }
  }
}

export function simulatorCacheDirectory() {
  const dotExpoHomeDirectory = UserSettings.dotExpoHomeDirectory();
  const dir = path.join(dotExpoHomeDirectory, 'ios-simulator-app-cache');
  fs.mkdirpSync(dir);
  return dir;
}

export async function upgradeExpoAsync(
  options: {
    udid?: string;
    url?: string;
  } = {}
): Promise<boolean> {
  if (!(await isSimulatorInstalledAsync())) {
    return false;
  }

  const simulator = await ensureSimulatorOpenAsync(options);

  await uninstallExpoAppFromSimulatorAsync(simulator);
  const installResult = await installExpoOnSimulatorAsync({ url: options.url, simulator });
  if (installResult.status !== 0) {
    return false;
  }

  if (_lastUrl) {
    Logger.global.info(`Opening ${chalk.underline(_lastUrl)} in Expo`);
    await SimControl.openURLAsync({ udid: simulator.udid, url: _lastUrl });
    _lastUrl = null;
  }

  return true;
}

export async function openUrlInSimulatorSafeAsync({
  url,
  udid,
  isDetached = false,
}: {
  url: string;
  udid?: string;
  isDetached: boolean;
}): Promise<{ success: true } | { success: false; msg: string }> {
  if (!(await isSimulatorInstalledAsync())) {
    return {
      success: false,
      msg: 'Unable to verify Xcode and Simulator installation.',
    };
  }

  let simulator: SimControl.ListedDevice | null = null;
  try {
    simulator = await ensureSimulatorOpenAsync({ udid });
  } catch (error) {
    return {
      success: false,
      msg: error.message,
    };
  }

  try {
    if (!isDetached) {
      await ensureExpoClientInstalledAsync(simulator);
      _lastUrl = url;
    }

    Logger.global.info(`Opening ${chalk.underline(url)} on ${chalk.bold(simulator.name)}`);
    await SimControl.openURLAsync({ url, udid: simulator.udid });
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

async function ensureExpoClientInstalledAsync(
  simulator: Pick<SimControl.ListedDevice, 'udid' | 'name'>
) {
  let isInstalled = await isExpoClientInstalledOnSimulatorAsync(simulator);

  if (isInstalled) {
    if (await doesExpoClientNeedUpdatedAsync(simulator)) {
      const { confirm } = await prompt({
        type: 'confirm',
        name: 'confirm',
        message: `Expo client on ${simulator.name} is outdated, would you like to upgrade?`,
      });
      if (confirm) {
        await uninstallExpoAppFromSimulatorAsync(simulator);
        await waitForExpoClientUninstalledOnSimulatorAsync(simulator);
        isInstalled = false;
      }
    }
  }
  if (!isInstalled) {
    await installExpoOnSimulatorAsync({ simulator });
    await waitForExpoClientInstalledOnSimulatorAsync(simulator);
  }
}

export async function openProjectAsync({
  projectRoot,
  shouldPrompt,
}: {
  shouldPrompt: boolean;
  projectRoot: string;
}): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const projectUrl = await UrlUtils.constructManifestUrlAsync(projectRoot, {
    hostType: 'localhost',
  });
  const { exp } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
  });

  let device: SimControl.ListedDevice | null = null;
  if (shouldPrompt) {
    const devices = await getSelectableSimulatorsAsync();
    device = await promptForSimulatorAsync(devices);
  } else {
    device = await ensureSimulatorOpenAsync({ udid: _lastUdid ?? undefined });
  }
  _lastUdid = device.udid;

  const result = await openUrlInSimulatorSafeAsync({
    udid: device.udid,
    url: projectUrl,
    isDetached: !!exp.isDetached,
  });

  if (result.success) {
    await activateSimulatorWindowAsync();
    return { success: true, url: projectUrl };
  }
  return { success: result.success, error: result.msg };
}

export async function openWebProjectAsync({
  projectRoot,
  shouldPrompt,
}: {
  shouldPrompt: boolean;
  projectRoot: string;
}): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const projectUrl = await getWebpackUrlAsync(projectRoot);
  if (projectUrl === null) {
    return {
      success: false,
      error: `The web project has not been started yet`,
    };
  }

  let device: SimControl.ListedDevice | null = null;
  if (shouldPrompt) {
    const devices = await getSelectableSimulatorsAsync();
    device = await promptForSimulatorAsync(devices);
  } else {
    device = await ensureSimulatorOpenAsync({ udid: _lastUdid ?? undefined });
  }
  _lastUdid = device.udid;
  const result = await openUrlInSimulatorSafeAsync({
    url: projectUrl,
    udid: device.udid,
    isDetached: true,
  });
  if (result.success) {
    await activateSimulatorWindowAsync();
    return { success: true, url: projectUrl };
  }
  return { success: result.success, error: result.msg };
}

async function promptForSimulatorAsync(
  devices: SimControl.ListedDevice[]
): Promise<SimControl.ListedDevice> {
  // TODO: cache the last used device so the user can spam click and get the expected results.
  // Resort the devices so the first one is iPhone 11
  let iterations = 0;
  while (devices[0].name !== 'iPhone 11' && iterations < devices.length) {
    devices.push(devices.shift()!);
    iterations++;
  }
  // TODO: Bail on non-interactive
  const results = await promptForDeviceAsync(devices);

  return devices.find(({ name }) => results === name)!;
}

async function promptForDeviceAsync(devices: SimControl.ListedDevice[]): Promise<string> {
  // TODO: Sort by most likely to open
  // TODO: indicate which sims are booted already
  // TODO: provide an option to add or download more simulators
  // TODO: Add support for physical devices too.

  const { answer } = await prompt([
    {
      type: 'list',
      name: 'answer',
      message: 'Select a simulator to run on',
      // @ts-ignore
      choices: devices
        // .reduce<SimControl.ListedDevice[]>((prev, current) => {
        //   if (prev.length && prev[prev.length - 1].osType !== current.osType) {
        //     prev.push(new Separator());
        //   }
        //   return [...prev, current];
        // }, [])
        .map(item => {
          if (item instanceof Separator) {
            return item;
          } else {
            return { name: item.windowName, value: item.name };
          }
        }),
      // @ts-ignore
      loop: false,
    },
  ]);
  return answer;
}
