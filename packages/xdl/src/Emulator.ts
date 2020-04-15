// A light weight adb class that can be used in other packages

import spawnAsync from '@expo/spawn-async';
import child_process from 'child_process';
import _ from 'lodash';

const BEGINNING_OF_ADB_ERROR_MESSAGE = 'error: ';
const CANT_START_ACTIVITY_ERROR = 'Activity not started, unable to resolve Intent';

const EMULATOR_MAX_WAIT_TIMEOUT = 45 * 1000;

export function whichEmulator(): string {
  if (process.env.ANDROID_HOME) {
    return `${process.env.ANDROID_HOME}/emulator/emulator`;
  }
  return 'emulator';
}

export function whichADB(): string {
  if (process.env.ANDROID_HOME) {
    return `${process.env.ANDROID_HOME}/platform-tools/adb`;
  }
  return 'adb';
}

/**
 * Returns a list of emulator names.
 */
export async function getEmulatorsAsync(): Promise<string[]> {
  try {
    const { stdout } = await spawnAsync(whichEmulator(), ['-list-avds']);
    return stdout.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

export async function maybeStartEmulatorAsync(name: string): Promise<void> {
  // Start a process to open an emulator
  const emulatorProcess = child_process.spawn(whichEmulator(), [`@${name}`], {
    stdio: 'ignore',
    detached: true,
  });

  emulatorProcess.unref();

  return new Promise<void>((resolve, reject) => {
    const waitTimer = setInterval(async () => {
      if (await isDeviceAttachedAsync()) {
        stopWaiting();
        resolve();
      }
    }, 1000);

    // Reject command after timeout
    const maxWait = setTimeout(() => {
      const manualCommand = `${whichEmulator()} @${name}`;
      stopWaitingAndReject(
        `It took too long to start the Android emulator: ${name}. You can try starting the emulator manually from the terminal with: ${manualCommand}`
      );
    }, EMULATOR_MAX_WAIT_TIMEOUT);

    const stopWaiting = () => {
      clearTimeout(maxWait);
      clearInterval(waitTimer);
    };

    const stopWaitingAndReject = (message: string) => {
      stopWaiting();
      reject(new Error(message));
      clearInterval(waitTimer);
    };

    emulatorProcess.on('error', ({ message }) => stopWaitingAndReject(message));

    emulatorProcess.on('exit', () => {
      const manualCommand = `${whichEmulator()} @${name}`;
      stopWaitingAndReject(
        `The emulator (${name}) quit before it finished opening. You can try starting the emulator manually from the terminal with: ${manualCommand}`
      );
    });
  });
}

export function isPlatformSupported(): boolean {
  return (
    process.platform === 'darwin' || process.platform === 'win32' || process.platform === 'linux'
  );
}

export async function getAdbOutputAsync(args: string[]): Promise<string> {
  const adb = whichADB();

  try {
    let result = await spawnAsync(adb, args);
    return result.stdout;
  } catch (e) {
    let errorMessage = _.trim(e.stderr || e.stdout);
    if (errorMessage.startsWith(BEGINNING_OF_ADB_ERROR_MESSAGE)) {
      errorMessage = errorMessage.substring(BEGINNING_OF_ADB_ERROR_MESSAGE.length);
    }
    throw new Error(errorMessage);
  }
}

// Device attached
export async function isDeviceAttachedAsync() {
  let output = await getAdbOutputAsync(['devices']);
  const devices = output
    .trim()
    .split(/\r?\n/)
    .reduce<string[]>((previous, line) => {
      const [name, type] = line.split(/[ ,\t]+/).filter(Boolean);
      return type === 'device' ? previous.concat(name) : previous;
    }, []);
  return devices.length > 0;
}

export async function isDeviceAuthorizedAsync() {
  let devices = await getAdbOutputAsync(['devices']);
  let lines = _.trim(devices).split(/\r?\n/);
  lines.shift();
  let listOfDevicesWithoutFirstLine = lines.join('\n');
  // result looks like "072c4cf200e333c7  device" when authorized
  // and "072c4cf200e333c7  unauthorized" when not.
  return listOfDevicesWithoutFirstLine.includes('device');
}

export async function respondsToPackagesAsync(packageName: string): Promise<boolean> {
  const emulatorPackages = await getAdbOutputAsync(['shell', 'pm', 'list', 'packages', '-f']);
  const lines = emulatorPackages.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Lines are formatted like: package:/system/app.apk=com.app.mine
    if ((line.split('=').pop() ?? line) === packageName) {
      return true;
    }
  }

  return false;
}

export async function openUrlAsync(url: string, packageName?: string) {
  if (packageName) {
    // NOTE(brentvatne): temporary workaround! launch expo client first, then
    // launch the project!
    // https://github.com/expo/expo/issues/7772
    // adb shell monkey -p host.exp.exponent -c android.intent.category.LAUNCHER 1
    let openClient = await getAdbOutputAsync([
      'shell',
      'monkey',
      '-p',
      packageName,
      '-c',
      'android.intent.category.LAUNCHER',
      '1',
    ]);
    if (openClient.includes(CANT_START_ACTIVITY_ERROR)) {
      throw new Error(openClient.substring(openClient.indexOf('Error: ')));
    }
  }

  let openProject = await getAdbOutputAsync(
    ['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url, packageName].filter<
      string
      // @ts-ignore: Boolean filter doesn't work well with TS
    >(Boolean)
  );
  if (openProject.includes(CANT_START_ACTIVITY_ERROR)) {
    throw new Error(openProject.substring(openProject.indexOf('Error: ')));
  }

  return openProject;
}

export async function maybeStopAdbDaemonAsync() {
  try {
    await getAdbOutputAsync(['kill-server']);
    return true;
  } catch {
    return false;
  }
}
