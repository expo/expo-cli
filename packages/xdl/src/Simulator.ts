import { getConfig } from '@expo/config';
import * as osascript from '@expo/osascript';
import spawnAsync from '@expo/spawn-async';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import ProgressBar from 'progress';
import prompts from 'prompts';
import semver from 'semver';

import Analytics from './Analytics';
import Api from './Api';
import Logger from './Logger';
import NotificationCode from './NotificationCode';
import * as Prompts from './Prompts';
import * as SimControl from './SimControl';
import * as UrlUtils from './UrlUtils';
import UserSettings from './UserSettings';
import * as Versions from './Versions';
import { getUrlAsync as getWebpackUrlAsync } from './Webpack';
import * as Xcode from './Xcode';
import { delayAsync } from './utils/delayAsync';

let _lastUrl: string | null = null;
let _lastUdid: string | null = null;

const SUGGESTED_XCODE_VERSION = `${Xcode.minimumVersion}.0`;

const INSTALL_WARNING_TIMEOUT = 60 * 1000;

export function isPlatformSupported() {
  return process.platform === 'darwin';
}

/**
 * Ensure Xcode is installed an recent enough to be used with Expo.
 *
 * @return true when Xcode is installed, false when the process should end.
 */
export async function ensureXcodeInstalledAsync(): Promise<boolean> {
  const promptToOpenAppStoreAsync = async (message: string) => {
    // This prompt serves no purpose accept informing the user what to do next, we could just open the App Store but it could be confusing if they don't know what's going on.
    const confirm = await Prompts.confirmAsync({ initial: true, message });
    if (confirm) {
      Logger.global.info(`Going to the App Store, re-run Expo when Xcode is finished installing.`);
      await Xcode.openAppStoreAsync(Xcode.appStoreId);
    }
  };

  const version = await Xcode.getXcodeVersionAsync();
  if (!version) {
    // Almost certainly Xcode isn't installed.
    await promptToOpenAppStoreAsync(
      `Xcode needs to be installed (don't worry, you won't have to use it), would you like to continue to the App Store?`
    );
    return false;
  }

  if (!semver.valid(version)) {
    // Not sure why this would happen, if it does we should add a more confident error message.
    console.error(`Xcode version is in an unknown format: ${version}`);
    return false;
  }

  if (semver.lt(version, SUGGESTED_XCODE_VERSION)) {
    // Xcode version is too old.
    await promptToOpenAppStoreAsync(
      `Xcode (${version}) needs to be updated to at least version ${Xcode.minimumVersion}, would you like to continue to the App Store?`
    );
    return false;
  }

  return true;
}

async function ensureXcodeCommandLineToolsInstalledAsync(): Promise<boolean> {
  if (!(await ensureXcodeInstalledAsync())) {
    // Need Xcode to install the CLI afaict
    return false;
  } else if (await SimControl.isXcrunInstalledAsync()) {
    // Run this second to ensure the Xcode version check is run.
    return true;
  }

  async function pendingAsync(): Promise<boolean> {
    if (await SimControl.isXcrunInstalledAsync()) {
      return true;
    } else {
      await delayAsync(100);
      return await pendingAsync();
    }
  }

  // This prompt serves no purpose accept informing the user what to do next, we could just open the App Store but it could be confusing if they don't know what's going on.
  const confirm = await Prompts.confirmAsync({
    initial: true,
    message: `Xcode ${chalk.bold`Command Line Tools`} needs to be installed (requires ${chalk.bold`sudo`}), continue?`,
  });

  if (!confirm) {
    return false;
  }

  try {
    await spawnAsync('sudo', [
      'xcode-select',
      '--install',
      // TODO: Is there any harm in skipping this?
      // '--switch', '/Applications/Xcode.app'
    ]);
    // Most likely the user will cancel the process, but if they don't this will continue checking until the CLI is available.
    await pendingAsync();
    return true;
  } catch (error) {
    // TODO: Figure out why this might get called (cancel early, network issues, server problems)
    // TODO: Handle me
  }
  return false;
}

class TimeoutError extends Error {}

// Simulator installed
export async function isSimulatorInstalledAsync() {
  // Check to ensure Xcode and its CLI are installed and up to date.
  if (!(await ensureXcodeCommandLineToolsInstalledAsync())) {
    return false;
  }
  // TODO: extract into ensureSimulatorInstalled method

  let result;
  try {
    result = (await osascript.execAsync('id of app "Simulator"')).trim();
  } catch (e) {
    // This error may occur in CI where the users intends to install just the simulators but no Xcode.
    console.error(
      "Can't determine id of Simulator app; the Simulator is most likely not installed on this machine. Run `sudo xcode-select -s /Applications/Xcode.app`",
      e
    );
    return false;
  }
  if (
    result !== 'com.apple.iphonesimulator' &&
    result !== 'com.apple.CoreSimulator.SimulatorTrampoline'
  ) {
    // TODO: FYI
    console.warn(
      "Simulator is installed but is identified as '" + result + "'; don't know what that is."
    );
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

/**
 * Ensure a simulator is booted and the Simulator app is opened.
 * This is where any timeout related error handling should live.
 */
export async function ensureSimulatorOpenAsync(
  { udid }: { udid?: string } = {},
  tryAgain: boolean = true
): Promise<SimControl.SimulatorDevice> {
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
        (await getFirstAvailableDeviceAsync()).udid;
    }
  }

  const bootedDevice = await waitForDeviceToBootAsync({ udid });

  if (!bootedDevice) {
    // Give it a second chance, this might not be needed but it could potentially lead to a better UX on slower devices.
    if (tryAgain) {
      return await ensureSimulatorOpenAsync({ udid }, false);
    }
    // TODO: We should eliminate all needs for a timeout error, it's bad UX to get an error about the simulator not starting while the user can clearly see it starting on their slow computer.
    throw new TimeoutError(
      `Simulator didn't boot fast enough. Try opening Simulator first, then running your app.`
    );
  }
  return bootedDevice;
}

/**
 * Get all simulators supported by Expo (iOS only).
 */
async function getSelectableSimulatorsAsync(): Promise<SimControl.SimulatorDevice[]> {
  const simulators = await getSimulatorsAsync();
  return simulators.filter(device => device.isAvailable && device.osType === 'iOS');
}

async function getSimulatorsAsync(): Promise<SimControl.SimulatorDevice[]> {
  const simulatorDeviceInfo = await SimControl.listAsync('devices');
  return Object.values(simulatorDeviceInfo.devices).reduce((prev, runtime) => {
    return prev.concat(runtime);
  }, []);
}

async function getBootedSimulatorsAsync(): Promise<SimControl.SimulatorDevice[]> {
  const simulators = await getSimulatorsAsync();
  return simulators.filter(device => device.state === 'Booted');
}

export async function isSimulatorBootedAsync({
  udid,
}: {
  udid?: string;
} = {}): Promise<SimControl.SimulatorDevice | null> {
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

async function getFirstAvailableDeviceAsync() {
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
}: Pick<SimControl.SimulatorDevice, 'udid'>): Promise<SimControl.SimulatorDevice | null> {
  return waitForActionAsync<SimControl.SimulatorDevice | null>({
    action: () => {
      return SimControl.bootAsync({ udid });
    },
  });
}

export async function activateSimulatorWindowAsync() {
  // TODO: Focus the individual window
  return await osascript.execAsync(`tell application "Simulator" to activate`);
}

export async function closeSimulatorAppAsync() {
  return await osascript.execAsync('tell application "Simulator" to quit');
}

export async function isExpoClientInstalledOnSimulatorAsync({
  udid,
}: {
  udid: string;
}): Promise<boolean> {
  return !!(await SimControl.getContainerPathAsync(udid, 'host.exp.Exponent'));
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
  const localPath = await SimControl.getContainerPathAsync(udid, 'host.exp.Exponent');
  if (!localPath) {
    return null;
  }

  const regex = /Exponent-([0-9.]+).*\.app$/;
  const regexMatch = regex.exec(localPath);
  if (!regexMatch) {
    return null;
  }

  let matched = regexMatch[1];
  // If the value is matched like 1.0.0. then remove the trailing dot.
  if (matched.endsWith('.')) {
    matched = matched.substr(0, matched.length - 1);
  }
  return matched;
}

export async function doesExpoClientNeedUpdatedAsync(
  simulator: Pick<SimControl.SimulatorDevice, 'udid'>,
  sdkVersion?: string
): Promise<boolean> {
  // Test that upgrading works by returning true
  // return true;
  const versions = await Versions.versionsAsync();
  const clientForSdk = await getClientForSDK(sdkVersion);
  const latestVersionForSdk = clientForSdk?.version ?? versions.iosVersion;

  const installedVersion = await expoVersionOnSimulatorAsync(simulator);
  if (installedVersion && semver.lt(installedVersion, latestVersionForSdk)) {
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
  version,
}: {
  simulator: Pick<SimControl.SimulatorDevice, 'name' | 'udid'>;
  url?: string;
  version?: string;
}) {
  const bar = new ProgressBar(
    `Installing the Expo Go app on ${simulator.name} [:bar] :percent :etas`,
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

  if (version) {
    Logger.global.info(`Installing Expo client ${version} on ${simulator.name}`);
  } else {
    Logger.global.info(`Installing Expo client on ${simulator.name}`);
  }

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
  } catch (e) {
    if (!e.message?.includes('No devices are booted.')) {
      console.error(e);
      throw e;
    }
  }
}

function simulatorCacheDirectory() {
  const dotExpoHomeDirectory = UserSettings.dotExpoHomeDirectory();
  const dir = path.join(dotExpoHomeDirectory, 'ios-simulator-app-cache');
  fs.mkdirpSync(dir);
  return dir;
}

export async function upgradeExpoAsync(
  options: {
    udid?: string;
    url?: string;
    version?: string;
  } = {}
): Promise<boolean> {
  if (!(await isSimulatorInstalledAsync())) {
    return false;
  }

  const simulator = await ensureSimulatorOpenAsync(options);

  await uninstallExpoAppFromSimulatorAsync(simulator);
  const installResult = await installExpoOnSimulatorAsync({
    url: options.url,
    version: options.version,
    simulator,
  });
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
  sdkVersion,
}: {
  url: string;
  udid?: string;
  sdkVersion?: string;
  isDetached: boolean;
}): Promise<{ success: true } | { success: false; msg: string }> {
  if (!(await isSimulatorInstalledAsync())) {
    return {
      success: false,
      msg: 'Unable to verify Xcode and Simulator installation.',
    };
  }

  let simulator: SimControl.SimulatorDevice | null = null;
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
      await ensureExpoClientInstalledAsync(simulator, sdkVersion);
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

// Keep a list of simulator UDIDs so we can prevent asking multiple times if a user wants to upgrade.
// This can prevent annoying interactions when they don't want to upgrade for whatever reason.
const hasPromptedToUpgrade: Record<string, boolean> = {};

async function ensureExpoClientInstalledAsync(
  simulator: Pick<SimControl.SimulatorDevice, 'udid' | 'name'>,
  sdkVersion?: string
) {
  let isInstalled = await isExpoClientInstalledOnSimulatorAsync(simulator);

  if (isInstalled) {
    if (
      !hasPromptedToUpgrade[simulator.udid] &&
      (await doesExpoClientNeedUpdatedAsync(simulator, sdkVersion))
    ) {
      // Only prompt once per simulator in a single run.
      hasPromptedToUpgrade[simulator.udid] = true;
      const confirm = await Prompts.confirmAsync({
        initial: true,
        message: `Expo client on ${simulator.name} is outdated, would you like to upgrade?`,
      });
      if (confirm) {
        // TODO: Is there any downside to skipping the uninstall step?
        // await uninstallExpoAppFromSimulatorAsync(simulator);
        // await waitForExpoClientUninstalledOnSimulatorAsync(simulator);
        isInstalled = false;
      }
    }
  }
  // If it's still "not installed" then install it (again).
  if (!isInstalled) {
    const iosClient = await getClientForSDK(sdkVersion);
    await installExpoOnSimulatorAsync({ simulator, ...iosClient });
    await waitForExpoClientInstalledOnSimulatorAsync(simulator);
  }
}

async function getClientForSDK(sdkVersionString?: string) {
  if (!sdkVersionString) {
    return null;
  }

  const sdkVersion = (await Versions.sdkVersionsAsync())[sdkVersionString];
  return {
    url: sdkVersion.iosClientUrl,
    version: sdkVersion.iosClientVersion,
  };
}

export async function openProjectAsync({
  projectRoot,
  shouldPrompt,
}: {
  projectRoot: string;
  shouldPrompt?: boolean;
}): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const projectUrl = await UrlUtils.constructDeepLinkAsync(projectRoot, {
    hostType: 'localhost',
  });
  const { exp } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
  });

  let device: SimControl.SimulatorDevice | null = null;
  if (shouldPrompt) {
    const devices = await getSelectableSimulatorsAsync();
    device = await promptForSimulatorAsync(devices);
  } else {
    device = await ensureSimulatorOpenAsync({ udid: _lastUdid ?? undefined });
  }
  if (!device) {
    return { success: false, error: 'escaped' };
  }
  _lastUdid = device.udid;

  const result = await openUrlInSimulatorSafeAsync({
    udid: device.udid,
    url: projectUrl,
    sdkVersion: exp.sdkVersion,
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

  let device: SimControl.SimulatorDevice | null = null;
  if (shouldPrompt) {
    const devices = await getSelectableSimulatorsAsync();
    device = await promptForSimulatorAsync(devices);
  } else {
    device = await ensureSimulatorOpenAsync({ udid: _lastUdid ?? undefined });
  }
  if (!device) {
    return { success: false, error: 'escaped' };
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

/**
 * Sort the devices so the last simulator that was opened (user's default) is the first suggested.
 *
 * @param devices
 */
export async function sortDefaultDeviceToBeginningAsync(
  devices: SimControl.SimulatorDevice[]
): Promise<SimControl.SimulatorDevice[]> {
  const defaultUdid =
    (await _getDefaultSimulatorDeviceUDIDAsync()) ?? (await getFirstAvailableDeviceAsync()).udid;
  if (defaultUdid) {
    let iterations = 0;
    while (devices[0].udid !== defaultUdid && iterations < devices.length) {
      devices.push(devices.shift()!);
      iterations++;
    }
  }
  return devices;
}

export async function promptForSimulatorAsync(
  devices: SimControl.SimulatorDevice[]
): Promise<SimControl.SimulatorDevice | null> {
  devices = await sortDefaultDeviceToBeginningAsync(devices);
  // TODO: Bail on non-interactive
  const results = await promptForDeviceAsync(devices);

  return results ? devices.find(({ udid }) => results === udid)! : null;
}

async function promptForDeviceAsync(
  devices: SimControl.SimulatorDevice[]
): Promise<string | undefined> {
  // TODO: provide an option to add or download more simulators
  // TODO: Add support for physical devices too.

  // Pause interactions on the TerminalUI
  Prompts.pauseInteractions();

  const { value } = await prompts({
    type: 'autocomplete',
    name: 'value',
    limit: 11,
    message: 'Select a simulator',
    choices: devices.map(item => {
      const isActive = item.state === 'Booted';
      const format = isActive ? chalk.bold : (text: string) => text;
      return {
        title: `${format(item.name)} ${chalk.dim(`(${item.osVersion})`)}`,
        value: item.udid,
      };
    }),
    suggest: (input: any, choices: any) => {
      const regex = new RegExp(input, 'i');
      return choices.filter((choice: any) => regex.test(choice.title));
    },
  });

  // Resume interactions on the TerminalUI
  Prompts.resumeInteractions();
  return value;
}
