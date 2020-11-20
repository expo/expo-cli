import { getConfig, readExpRcAsync } from '@expo/config';
import spawnAsync from '@expo/spawn-async';
import chalk from 'chalk';
import child_process from 'child_process';
import fs from 'fs-extra';
import trim from 'lodash/trim';
import os from 'os';
import path from 'path';
import ProgressBar from 'progress';
import prompts from 'prompts';
import semver from 'semver';

import Analytics from './Analytics';
import Api from './Api';
import * as Binaries from './Binaries';
import Logger from './Logger';
import NotificationCode from './NotificationCode';
import * as ProjectSettings from './ProjectSettings';
import * as Prompts from './Prompts';
import * as UrlUtils from './UrlUtils';
import UserSettings from './UserSettings';
import * as Versions from './Versions';
import { getUrlAsync as getWebpackUrlAsync } from './Webpack';
import { learnMore } from './logs/TerminalLink';
import { getImageDimensionsAsync } from './tools/ImageUtils';

type Device = {
  pid?: string;
  name: string;
  type: 'emulator' | 'device';
  isBooted: boolean;
  isAuthorized: boolean;
};

let _lastUrl: string | null = null;
let _isAdbOwner: boolean | null = null;

const BEGINNING_OF_ADB_ERROR_MESSAGE = 'error: ';
const CANT_START_ACTIVITY_ERROR = 'Activity not started, unable to resolve Intent';

const INSTALL_WARNING_TIMEOUT = 60 * 1000;

const EMULATOR_MAX_WAIT_TIMEOUT = 60 * 1000 * 3;

function whichEmulator(): string {
  if (process.env.ANDROID_HOME) {
    return `${process.env.ANDROID_HOME}/emulator/emulator`;
  }
  return 'emulator';
}

function whichADB(): string {
  if (process.env.ANDROID_HOME) {
    return `${process.env.ANDROID_HOME}/platform-tools/adb`;
  }
  return 'adb';
}

/**
 * Returns a list of emulator names.
 */
async function getEmulatorsAsync(): Promise<Device[]> {
  try {
    const { stdout } = await spawnAsync(whichEmulator(), ['-list-avds']);
    return stdout
      .split(os.EOL)
      .filter(Boolean)
      .map(name => ({
        name,
        type: 'emulator',
        // unsure from this
        isBooted: false,
        isAuthorized: true,
      }));
  } catch {
    return [];
  }
}

/**
 * Return the Emulator name for an emulator ID, this can be used to determine if an emulator is booted.
 *
 * @param emulatorId a value like `emulator-5554` from `abd devices`
 */
async function getAbdNameForEmulatorIdAsync(emulatorId: string): Promise<string | null> {
  return (
    trim(await getAdbOutputAsync(['-s', emulatorId, 'emu', 'avd', 'name']))
      .split(/\r?\n/)
      .shift() ?? null
  );
}

export async function getAllAvailableDevicesAsync(): Promise<Device[]> {
  const bootedDevices = await getAttachedDevicesAsync();

  const data = await getEmulatorsAsync();
  const connectedNames = bootedDevices.map(({ name }) => name);

  const offlineEmulators = data
    .filter(({ name }) => !connectedNames.includes(name))
    .map(({ name, type }) => {
      return {
        name,
        type,
        isBooted: false,
        // TODO: Are emulators always authorized?
        isAuthorized: true,
      };
    });

  const allDevices = bootedDevices.concat(offlineEmulators);

  if (!allDevices.length) {
    const genymotionMessage = `https://developer.android.com/studio/run/device.html#developer-device-options. If you are using Genymotion go to Settings -> ADB, select "Use custom Android SDK tools", and point it at your Android SDK directory.`;
    throw new Error(
      `No Android connected device found, and no emulators could be started automatically.\nPlease connect a device or create an emulator (https://docs.expo.io/workflow/android-studio-emulator).\nThen follow the instructions here to enable USB debugging:\n${genymotionMessage}`
    );
  }

  return allDevices;
}

/**
 * Returns true when a device's splash screen animation has stopped.
 * This can be used to detect when a device is fully booted and ready to use.
 *
 * @param pid
 */
async function isBootAnimationCompleteAsync(pid?: string): Promise<boolean> {
  try {
    const output = await getAdbOutputAsync(
      adbPidArgs(pid, 'shell', 'getprop', 'init.svc.bootanim')
    );
    return !!output.match(/stopped/);
  } catch {
    return false;
  }
}

async function startEmulatorAsync(device: Device): Promise<Device> {
  Logger.global.info(`\u203A Attempting to open emulator: ${device.name}`);

  // Start a process to open an emulator
  const emulatorProcess = child_process.spawn(
    whichEmulator(),
    [
      `@${device.name}`,
      // disable animation for faster boot -- this might make it harder to detect if it mounted properly tho
      //'-no-boot-anim'
      // '-google-maps-key' -- TODO: Use from config
    ],
    {
      stdio: 'ignore',
      detached: true,
    }
  );

  emulatorProcess.unref();

  return new Promise<Device>((resolve, reject) => {
    const waitTimer = setInterval(async () => {
      const bootedDevices = await getAttachedDevicesAsync();
      const connected = bootedDevices.find(({ name }) => name === device.name);
      if (connected) {
        const isBooted = await isBootAnimationCompleteAsync(connected.pid);
        if (isBooted) {
          stopWaiting();
          resolve(connected);
        }
      }
    }, 1000);

    // Reject command after timeout
    const maxTimer = setTimeout(() => {
      const manualCommand = `${whichEmulator()} @${device.name}`;
      stopWaitingAndReject(
        `It took too long to start the Android emulator: ${device.name}. You can try starting the emulator manually from the terminal with: ${manualCommand}`
      );
    }, EMULATOR_MAX_WAIT_TIMEOUT);

    const stopWaiting = () => {
      clearTimeout(maxTimer);
      clearInterval(waitTimer);
    };

    const stopWaitingAndReject = (message: string) => {
      stopWaiting();
      reject(new Error(message));
      clearInterval(waitTimer);
    };

    emulatorProcess.on('error', ({ message }) => stopWaitingAndReject(message));

    emulatorProcess.on('exit', () => {
      const manualCommand = `${whichEmulator()} @${device.name}`;
      stopWaitingAndReject(
        `The emulator (${device.name}) quit before it finished opening. You can try starting the emulator manually from the terminal with: ${manualCommand}`
      );
    });
  });
}

// TODO: This is very expensive for some operations.
export async function getAttachedDevicesAsync(): Promise<Device[]> {
  const output = await getAdbOutputAsync(['devices', '-l']);

  const splitItems = output.trim().replace(/\n$/, '').split(os.EOL);
  // First line is `"List of devices attached"`, remove it
  // @ts-ignore: todo
  const attachedDevices: {
    props: string[];
    type: Device['type'];
    isAuthorized: Device['isAuthorized'];
  }[] = splitItems
    .slice(1, splitItems.length)
    .map(line => {
      // unauthorized: ['FA8251A00719', 'unauthorized', 'usb:338690048X', 'transport_id:5']
      // authorized: ['FA8251A00719', 'device', 'usb:336592896X', 'product:walleye', 'model:Pixel_2', 'device:walleye', 'transport_id:4']
      // emulator: ['emulator-5554', 'offline', 'transport_id:1']
      const props = line.split(' ').filter(Boolean);

      const isAuthorized = props[1] !== 'unauthorized';
      const type = line.includes('emulator') ? 'emulator' : 'device';
      return { props, type, isAuthorized };
    })
    .filter(({ props: [pid] }) => !!pid);

  const devicePromises = attachedDevices.map<Promise<Device>>(async props => {
    const {
      type,
      props: [pid, ...deviceInfo],
      isAuthorized,
    } = props;

    let name: string | null = null;

    if (type === 'device') {
      if (isAuthorized) {
        // Possibly formatted like `model:Pixel_2`
        // Transform to `Pixel_2`
        const modelItem = deviceInfo.find(info => info.includes('model:'));
        if (modelItem) {
          name = modelItem.replace('model:', '');
        }
      }
      // unauthorized devices don't have a name available to read
      if (!name) {
        // Device FA8251A00719
        name = `Device ${pid}`;
      }
    } else {
      // Given an emulator pid, get the emulator name which can be used to start the emulator later.
      name = (await getAbdNameForEmulatorIdAsync(pid)) ?? '';
    }

    return {
      pid,
      name,
      type,
      isAuthorized,
      isBooted: true,
    };
  });

  return Promise.all(devicePromises);
}

export function isPlatformSupported(): boolean {
  return (
    process.platform === 'darwin' || process.platform === 'win32' || process.platform === 'linux'
  );
}

async function adbAlreadyRunning(adb: string): Promise<boolean> {
  try {
    const result = await spawnAsync(adb, ['start-server']);
    const lines = trim(result.stderr).split(/\r?\n/);
    return lines.includes('* daemon started successfully') === false;
  } catch (e) {
    let errorMessage = trim(e.stderr || e.stdout);
    if (errorMessage.startsWith(BEGINNING_OF_ADB_ERROR_MESSAGE)) {
      errorMessage = errorMessage.substring(BEGINNING_OF_ADB_ERROR_MESSAGE.length);
    }
    throw new Error(errorMessage);
  }
}

export async function getAdbOutputAsync(args: string[]): Promise<string> {
  await Binaries.addToPathAsync('adb');
  const adb = whichADB();

  if (_isAdbOwner === null) {
    const alreadyRunning = await adbAlreadyRunning(adb);
    _isAdbOwner = alreadyRunning === false;
  }

  try {
    const result = await spawnAsync(adb, args);
    return result.stdout;
  } catch (e) {
    let errorMessage = (e.stderr || e.stdout || e.message).trim();
    if (errorMessage.startsWith(BEGINNING_OF_ADB_ERROR_MESSAGE)) {
      errorMessage = errorMessage.substring(BEGINNING_OF_ADB_ERROR_MESSAGE.length);
    }
    throw new Error(errorMessage);
  }
}

async function _isDeviceAuthorizedAsync(device: Device): Promise<boolean> {
  // TODO: Get the latest version of the device in case isAuthorized changes.
  return device.isAuthorized;
}

// Expo installed
async function _isExpoInstalledAsync(device: Device) {
  const packages = await getAdbOutputAsync(
    adbPidArgs(device.pid, 'shell', 'pm', 'list', 'packages', '-f')
  );

  const lines = packages.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('host.exp.exponent.test')) {
      continue;
    }

    if (line.includes('host.exp.exponent')) {
      return true;
    }
  }

  return false;
}

async function getExpoVersionAsync(device: Device): Promise<string | null> {
  const info = await getAdbOutputAsync(
    adbPidArgs(device.pid, 'shell', 'dumpsys', 'package', 'host.exp.exponent')
  );

  const regex = /versionName=([0-9.]+)/;
  const regexMatch = regex.exec(info);
  if (!regexMatch || regexMatch.length < 2) {
    return null;
  }

  return regexMatch[1];
}

async function isClientOutdatedAsync(device: Device): Promise<boolean> {
  const versions = await Versions.versionsAsync();
  const installedVersion = await getExpoVersionAsync(device);
  return !installedVersion || semver.lt(installedVersion, versions.androidVersion);
}

function _apkCacheDirectory() {
  const dotExpoHomeDirectory = UserSettings.dotExpoHomeDirectory();
  const dir = path.join(dotExpoHomeDirectory, 'android-apk-cache');
  fs.mkdirpSync(dir);
  return dir;
}

export async function downloadApkAsync(
  url?: string,
  downloadProgressCallback?: (roundedProgress: number) => void
) {
  if (!url) {
    const versions = await Versions.versionsAsync();
    url = versions.androidUrl;
  }

  const filename = path.parse(url).name;
  const apkPath = path.join(_apkCacheDirectory(), `${filename}.apk`);

  if (await fs.pathExists(apkPath)) {
    return apkPath;
  }

  await Api.downloadAsync(url, apkPath, undefined, downloadProgressCallback);
  return apkPath;
}

export async function installExpoAsync({
  device,
  url,
  version,
}: {
  device: Device;
  url?: string;
  version?: string;
}) {
  const bar = new ProgressBar('Downloading the Expo client app [:bar] :percent :etas', {
    total: 100,
    width: 64,
  });

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
  const path = await downloadApkAsync(url, progress => bar.tick(1, progress));
  Logger.notifications.info({ code: NotificationCode.STOP_LOADING });

  if (version) {
    Logger.global.info(`Installing Expo client ${version} on device`);
  } else {
    Logger.global.info(`Installing Expo client on device`);
  }
  Logger.notifications.info({ code: NotificationCode.START_LOADING });
  warningTimer = setWarningTimer();
  const result = await getAdbOutputAsync(adbPidArgs(device.pid, 'install', path));
  Logger.notifications.info({ code: NotificationCode.STOP_LOADING });

  clearTimeout(warningTimer);
  return result;
}

export async function isDeviceBootedAsync({
  name,
}: { name?: string } = {}): Promise<Device | null> {
  const devices = await getAttachedDevicesAsync();

  if (!name) {
    return devices[0] ?? null;
  }

  return devices.find(device => device.name === name) ?? null;
}

export async function uninstallExpoAsync(device: Device): Promise<string | undefined> {
  Logger.global.info('Uninstalling Expo client from Android device.');

  // we need to check if its installed, else we might bump into "Failure [DELETE_FAILED_INTERNAL_ERROR]"
  const isInstalled = await _isExpoInstalledAsync(device);
  if (!isInstalled) {
    return;
  }

  try {
    return await getAdbOutputAsync(adbPidArgs(device.pid, 'uninstall', 'host.exp.exponent'));
  } catch (e) {
    Logger.global.error(
      'Could not uninstall Expo client from your device, please uninstall Expo client manually and try again.'
    );
    throw e;
  }
}

export async function upgradeExpoAsync(options?: {
  url?: string;
  version?: string;
}): Promise<boolean> {
  const { url, version } = options || {};

  try {
    const devices = await getAttachedDevicesAsync();
    if (!devices.length) {
      throw new Error('no devices connected');
    }

    const device = await attemptToStartEmulatorOrAssertAsync(devices[0]);
    if (!device) {
      return false;
    }

    await uninstallExpoAsync(device);
    await installExpoAsync({ device, url, version });
    if (_lastUrl) {
      Logger.global.info(`Opening ${_lastUrl} in Expo.`);
      await getAdbOutputAsync([
        'shell',
        'am',
        'start',
        '-a',
        'android.intent.action.VIEW',
        '-d',
        _lastUrl,
      ]);
      _lastUrl = null;
    }

    return true;
  } catch (e) {
    Logger.global.error(e.message);
    return false;
  }
}

async function _openUrlAsync({ pid, url }: { pid: string; url: string }) {
  // NOTE(brentvatne): temporary workaround! launch expo client first, then
  // launch the project!
  // https://github.com/expo/expo/issues/7772
  // adb shell monkey -p host.exp.exponent -c android.intent.category.LAUNCHER 1
  const openClient = await getAdbOutputAsync(
    adbPidArgs(
      pid,
      'shell',
      'monkey',
      '-p',
      'host.exp.exponent',
      '-c',
      'android.intent.category.LAUNCHER',
      '1'
    )
  );
  if (openClient.includes(CANT_START_ACTIVITY_ERROR)) {
    throw new Error(openClient.substring(openClient.indexOf('Error: ')));
  }

  const openProject = await getAdbOutputAsync(
    adbPidArgs(pid, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url)
  );
  if (openProject.includes(CANT_START_ACTIVITY_ERROR)) {
    throw new Error(openProject.substring(openProject.indexOf('Error: ')));
  }

  return openProject;
}

async function attemptToStartEmulatorOrAssertAsync(device: Device): Promise<Device | null> {
  // TODO: Add a light-weight method for checking since a device could disconnect.

  if (!(await isDeviceBootedAsync(device))) {
    device = await startEmulatorAsync(device);
  }

  if (!(await _isDeviceAuthorizedAsync(device))) {
    logUnauthorized(device);
    return null;
  }

  return device;
}

function logUnauthorized(device: Device) {
  Logger.global.warn(
    `\nThis computer is not authorized for developing on ${chalk.bold(device.name)}. ${chalk.dim(
      learnMore('https://expo.fyi/authorize-android-device')
    )}`
  );
}

// Keep a list of simulator UDIDs so we can prevent asking multiple times if a user wants to upgrade.
// This can prevent annoying interactions when they don't want to upgrade for whatever reason.
const hasPromptedToUpgrade: Record<string, boolean> = {};

async function openUrlAsync({
  url,
  device,
  isDetached = false,
}: {
  url: string;
  isDetached?: boolean;
  device: Device;
}): Promise<void> {
  try {
    const bootedDevice = await attemptToStartEmulatorOrAssertAsync(device);
    if (!bootedDevice) {
      return;
    }
    device = bootedDevice;

    let installedExpo = false;
    if (!isDetached) {
      let shouldInstall = !(await _isExpoInstalledAsync(device));
      const promptKey = device.pid ?? 'unknown';
      if (
        !shouldInstall &&
        !hasPromptedToUpgrade[promptKey] &&
        (await isClientOutdatedAsync(device))
      ) {
        // Only prompt once per device, per run.
        hasPromptedToUpgrade[promptKey] = true;
        const confirm = await Prompts.confirmAsync({
          initial: true,
          message: `Expo client on ${device.name} (${device.type}) is outdated, would you like to upgrade?`,
        });
        if (confirm) {
          await uninstallExpoAsync(device);
          shouldInstall = true;
        }
      }

      if (shouldInstall) {
        await installExpoAsync({ device });
        installedExpo = true;
      }
    }
    // process.exit(0);

    if (!isDetached) {
      _lastUrl = url;
      // _checkExpoUpToDateAsync(); // let this run in background
    }

    Logger.global.info(`Opening ${chalk.underline(url)} on ${chalk.bold(device.name)}`);

    try {
      await _openUrlAsync({ pid: device.pid!, url });
    } catch (e) {
      if (isDetached) {
        e.message = `Error running app. Have you installed the app already using Android Studio? Since you are detached you must build manually. ${e.message}`;
      } else {
        e.message = `Error running app. ${e.message}`;
      }

      throw e;
    }

    if (device.type === 'emulator') {
      // TODO: Bring the emulator window to the front.
    }

    Analytics.logEvent('Open Url on Device', {
      platform: 'android',
      installedExpo,
    });
  } catch (e) {
    e.message = `Error running adb: ${e.message}`;
    throw e;
  }
}

export async function openProjectAsync({
  projectRoot,
  shouldPrompt,
}: {
  projectRoot: string;
  shouldPrompt?: boolean;
}): Promise<{ success: true; url: string } | { success: false; error: string }> {
  try {
    await startAdbReverseAsync(projectRoot);

    const projectUrl = await UrlUtils.constructManifestUrlAsync(projectRoot);
    const { exp } = getConfig(projectRoot, {
      skipSDKVersionRequirement: true,
    });

    const devices = await getAllAvailableDevicesAsync();
    let device: Device | null = devices[0];
    if (shouldPrompt) {
      device = await promptForDeviceAsync(devices);
    }
    if (!device) {
      return { success: false, error: 'escaped' };
    }

    await openUrlAsync({ url: projectUrl, device, isDetached: !!exp.isDetached });
    return { success: true, url: projectUrl };
  } catch (e) {
    Logger.global.error(`Couldn't start project on Android: ${e.message}`);
    return { success: false, error: e };
  }
}

export async function openWebProjectAsync({
  projectRoot,
  shouldPrompt,
}: {
  projectRoot: string;
  shouldPrompt?: boolean;
}): Promise<{ success: true; url: string } | { success: false; error: string }> {
  try {
    await startAdbReverseAsync(projectRoot);

    const projectUrl = await getWebpackUrlAsync(projectRoot);
    if (projectUrl === null) {
      return {
        success: false,
        error: `The web project has not been started yet`,
      };
    }
    const devices = await getAllAvailableDevicesAsync();
    let device: Device | null = devices[0];
    if (shouldPrompt) {
      device = await promptForDeviceAsync(devices);
    }
    if (!device) {
      return { success: false, error: 'escaped' };
    }

    await openUrlAsync({ url: projectUrl, device, isDetached: true });
    return { success: true, url: projectUrl };
  } catch (e) {
    Logger.global.error(`Couldn't open the web project on Android: ${e.message}`);
    return { success: false, error: e };
  }
}

// Adb reverse
export async function startAdbReverseAsync(projectRoot: string): Promise<boolean> {
  const packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  const expRc = await readExpRcAsync(projectRoot);
  const userDefinedAdbReversePorts = expRc.extraAdbReversePorts || [];

  const adbReversePorts = [
    packagerInfo.packagerPort,
    packagerInfo.expoServerPort,
    ...userDefinedAdbReversePorts,
  ].filter(Boolean);

  const devices = await getAttachedDevicesAsync();
  for (const device of devices) {
    for (const port of adbReversePorts) {
      if (!(await adbReverse({ device, port }))) {
        return false;
      }
    }
  }

  return true;
}

export async function stopAdbReverseAsync(projectRoot: string): Promise<void> {
  const packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  const expRc = await readExpRcAsync(projectRoot);
  const userDefinedAdbReversePorts = expRc.extraAdbReversePorts || [];

  const adbReversePorts = [
    packagerInfo.packagerPort,
    packagerInfo.expoServerPort,
    ...userDefinedAdbReversePorts,
  ].filter(Boolean);

  const devices = await getAttachedDevicesAsync();
  for (const device of devices) {
    for (const port of adbReversePorts) {
      await adbReverseRemove({ device, port });
    }
  }
}

async function adbReverse({ device, port }: { device: Device; port: number }): Promise<boolean> {
  if (!(await _isDeviceAuthorizedAsync(device))) {
    return false;
  }

  try {
    await getAdbOutputAsync(adbPidArgs(device.pid, 'reverse', `tcp:${port}`, `tcp:${port}`));
    return true;
  } catch (e) {
    Logger.global.warn(`Couldn't adb reverse: ${e.message}`);
    return false;
  }
}

async function adbReverseRemove({
  device,
  port,
}: {
  device: Device;
  port: number;
}): Promise<boolean> {
  if (!(await _isDeviceAuthorizedAsync(device))) {
    return false;
  }

  try {
    await getAdbOutputAsync(adbPidArgs(device.pid, 'reverse', '--remove', `tcp:${port}`));
    return true;
  } catch (e) {
    // Don't send this to warn because we call this preemptively sometimes
    Logger.global.debug(`Couldn't adb reverse remove: ${e.message}`);
    return false;
  }
}

function adbPidArgs(pid: Device['pid'], ...options: string[]): string[] {
  const args = [];
  if (pid) {
    args.push('-s', pid);
  }
  return args.concat(options);
}

type DPIConstraint = {
  dpi: 'mdpi' | 'hdpi' | 'xhdpi' | 'xxhdpi' | 'xxxhdpi';
  sizeMultiplier: number;
};

const splashScreenDPIConstraints: readonly DPIConstraint[] = [
  {
    dpi: 'mdpi',
    sizeMultiplier: 1,
  },
  {
    dpi: 'hdpi',
    sizeMultiplier: 1.5,
  },
  {
    dpi: 'xhdpi',
    sizeMultiplier: 2,
  },
  {
    dpi: 'xxhdpi',
    sizeMultiplier: 3,
  },
  {
    dpi: 'xxxhdpi',
    sizeMultiplier: 4,
  },
];

/**
 * Checks whether `resizeMode` is set to `native` and if `true` analyzes provided images for splashscreen
 * providing `Logger` feedback upon problems.
 * @param projectDir - directory of the expo project
 * @since SDK33
 */
export async function checkSplashScreenImages(projectDir: string): Promise<void> {
  const { exp } = getConfig(projectDir);

  // return before SDK33
  if (!Versions.gteSdkVersion(exp, '33.0.0')) {
    return;
  }

  const splashScreenMode = exp.android?.splash?.resizeMode ?? exp.splash?.resizeMode ?? 'contain';

  // only mode `native` is handled by this check
  if (splashScreenMode === 'contain' || splashScreenMode === 'cover') {
    return;
  }

  const generalSplashImagePath = exp.splash?.image;
  if (!generalSplashImagePath) {
    Logger.global.warn(
      `Couldn't read '${chalk.italic('splash.image')}' from ${chalk.italic(
        'app.json'
      )}. Provide asset that would serve as baseline splash image.`
    );
    return;
  }
  const generalSplashImage = await getImageDimensionsAsync(projectDir, generalSplashImagePath);
  if (!generalSplashImage) {
    Logger.global.warn(
      `Couldn't read dimensions of provided splash image '${chalk.italic(
        generalSplashImagePath
      )}'. Does the file exist?`
    );
    return;
  }

  const androidSplash = exp.android?.splash;
  const androidSplashImages = [];
  for (const { dpi, sizeMultiplier } of splashScreenDPIConstraints) {
    const imageRelativePath = androidSplash?.[dpi];
    if (imageRelativePath) {
      const splashImage = await getImageDimensionsAsync(projectDir, imageRelativePath);
      if (!splashImage) {
        Logger.global.warn(
          `Couldn't read dimensions of provided splash image '${chalk.italic(
            imageRelativePath
          )}'. Does the file exist?`
        );
        continue;
      }
      const { width, height } = splashImage;
      const expectedWidth = sizeMultiplier * generalSplashImage.width;
      const expectedHeight = sizeMultiplier * generalSplashImage.height;
      androidSplashImages.push({
        dpi,
        width,
        height,
        expectedWidth,
        expectedHeight,
        sizeMatches: width === expectedWidth && height === expectedHeight,
      });
    }
  }

  if (androidSplashImages.length === 0) {
    Logger.global
      .warn(`Splash resizeMode is set to 'native', but you haven't provided any images for different DPIs.
Be aware that your splash image will be used as xxxhdpi asset and its ${chalk.bold(
      'actual size will be different'
    )} depending on device's DPI.
See https://docs.expo.io/guides/splash-screens/#splash-screen-api-limitations-on-android for more information`);
    return;
  }

  if (androidSplashImages.some(({ sizeMatches }) => !sizeMatches)) {
    Logger.global
      .warn(`Splash resizeMode is set to 'native' and you've provided different images for different DPIs,
but their sizes mismatch expected ones: [dpi: provided (expected)] ${androidSplashImages
      .map(
        ({ dpi, width, height, expectedWidth, expectedHeight }) =>
          `${dpi}: ${width}x${height} (${expectedWidth}x${expectedHeight})`
      )
      .join(', ')}
See https://docs.expo.io/guides/splash-screens/#splash-screen-api-limitations-on-android for more information`);
  }
}

export async function maybeStopAdbDaemonAsync() {
  if (_isAdbOwner !== true) {
    return false;
  }

  try {
    await getAdbOutputAsync(['kill-server']);
    return true;
  } catch {
    return false;
  }
}

function nameStyleForDevice(device: Device) {
  const isActive = device.isBooted;
  if (!isActive) {
    // Use no style changes for a disconnected device that is available to be opened.
    return (text: string) => text;
  }
  // A device that is connected and ready to be used should be bolded to match iOS.
  if (device.isAuthorized) {
    return chalk.bold;
  }
  // Devices that are unauthorized and connected cannot be used, but they are connected so gray them out.
  return (text: string) => chalk.bold(chalk.gray(text));
}

async function promptForDeviceAsync(devices: Device[]): Promise<Device | null> {
  // TODO: provide an option to add or download more simulators

  // Pause interactions on the TerminalUI
  Prompts.pauseInteractions();

  const { value } = await prompts({
    type: 'autocomplete',
    name: 'value',
    limit: 11,
    message: 'Select a device/emulator',
    choices: devices.map(item => {
      const format = nameStyleForDevice(item);
      const type = item.isAuthorized ? item.type : 'unauthorized';
      return {
        title: `${format(item.name)} ${chalk.dim(`(${type})`)}`,
        value: item.name,
      };
    }),
    suggest: (input: any, choices: any) => {
      const regex = new RegExp(input, 'i');
      return choices.filter((choice: any) => regex.test(choice.title));
    },
  });

  // Resume interactions on the TerminalUI
  Prompts.resumeInteractions();

  const device = value ? devices.find(({ name }) => name === value)! : null;

  if (device?.isAuthorized === false) {
    logUnauthorized(device);
    return null;
  }

  return device;
}
