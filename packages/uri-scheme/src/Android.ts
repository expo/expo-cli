import {
  format,
  getPackageAsync,
  readAndroidManifestAsync,
  writeAndroidManifestAsync,
} from '@expo/config/build/android/Manifest';
import * as Scheme from '@expo/config/build/android/Scheme';
import * as Emulator from '@expo/xdl/build/Emulator';
import chalk from 'chalk';
import { sync } from 'glob';
import path from 'path';

import { CommandError, Options } from './Options';

async function assertDeviceReadyAsync() {
  const genymotionMessage = `https://developer.android.com/studio/run/device.html#developer-device-options. If you are using Genymotion go to Settings -> ADB, select "Use custom Android SDK tools", and point it at your Android SDK directory.`;

  if (!(await Emulator.isDeviceAuthorizedAsync())) {
    throw new Error(
      `This computer is not authorized to debug the device. Please follow the instructions here to enable USB debugging:\n${genymotionMessage}`
    );
  }
}

async function attemptToStartEmulatorOrAssertAsync() {
  if (!(await Emulator.isDeviceAttachedAsync())) {
    // If no devices or emulators are attached we should attempt to open one.
    if (!(await maybeStartAnyEmulatorAsync())) {
      const genymotionMessage = `https://developer.android.com/studio/run/device.html#developer-device-options. If you are using Genymotion go to Settings -> ADB, select "Use custom Android SDK tools", and point it at your Android SDK directory.`;
      throw new Error(
        `No Android connected device found, and no emulators could be started automatically.\nPlease connect a device or create an emulator (https://docs.expo.io/versions/latest/workflow/android-studio-emulator).\nThen follow the instructions here to enable USB debugging:\n${genymotionMessage}`
      );
    }
  }
  await assertDeviceReadyAsync();
}

async function maybeStartAnyEmulatorAsync(): Promise<boolean> {
  const emulators = await Emulator.getEmulatorsAsync();
  if (emulators.length > 0) {
    console.log(chalk.magenta(`\u203A Attempting to start emulator named: ${emulators[0]}`));
    await Emulator.maybeStartEmulatorAsync(emulators[0]);
    return true;
  }
  return false;
}

export function isAvailable(projectRoot: string): boolean {
  const reactNativeAndroid = sync(
    path.join(projectRoot, 'android/app/src/main/AndroidManifest.xml')
  );
  const currentAndroid = sync(path.join(projectRoot, 'app/src/main/AndroidManifest.xml'));
  return !!currentAndroid.length || !!reactNativeAndroid.length;
}

export async function addAsync({ dryRun, uri, projectRoot }: Options): Promise<boolean> {
  const manifestPath = getConfigPath(projectRoot);
  let manifest = await readConfigAsync(manifestPath);

  if (!Scheme.ensureManifestHasValidIntentFilter(manifest)) {
    throw new CommandError(
      `Cannot add scheme "${uri}" because the provided manifest does not have a valid Activity with \`android:launchMode="singleTask"\``,
      'add'
    );
  }
  if (Scheme.hasScheme(uri, manifest)) {
    console.log(
      chalk.yellow(
        `\u203A Android: URI scheme "${uri}" already exists in AndroidManifest.xml at: ${manifestPath}`
      )
    );
    return false;
  }

  manifest = Scheme.appendScheme(uri, manifest);

  if (dryRun) {
    console.log(chalk.magenta('Write manifest to: ', manifestPath));
    console.log(format(manifest));
    return false;
  }
  await writeConfigAsync(manifestPath, manifest);
  return true;
}

export async function removeAsync({ dryRun, uri, projectRoot }: Options): Promise<boolean> {
  const manifestPath = getConfigPath(projectRoot);
  let manifest = await readConfigAsync(manifestPath);

  if (!Scheme.ensureManifestHasValidIntentFilter(manifest)) {
    throw new CommandError(
      `Cannot remove scheme "${uri}" because the provided manifest does not have a valid Activity with \`android:launchMode="singleTask"\``,
      'remove'
    );
  }

  if (!Scheme.hasScheme(uri, manifest)) {
    console.log(
      chalk.yellow(
        `\u203A Android: URI scheme "${uri}" does not exist in AndroidManifest.xml at: ${manifestPath}`
      )
    );
    return false;
  }

  manifest = Scheme.removeScheme(uri, manifest);

  if (dryRun) {
    console.log(chalk.magenta('Write manifest to: ', manifestPath));
    console.log(format(manifest));
    return false;
  }
  await writeConfigAsync(manifestPath, manifest);
  return true;
}

async function openUrlAsync(...props: (string | null)[]): Promise<string> {
  await attemptToStartEmulatorOrAssertAsync();
  const [uri, packageName] = props.filter(Boolean) as string[];
  if (packageName) {
    if (await Emulator.respondsToPackagesAsync(packageName)) {
      console.log(
        chalk.magenta(`\u203A ${chalk.bold('Android')}: Opening in app "${packageName}"`)
      );
    } else {
      throw new CommandError(`No app on the Android device matches package "${packageName}"`);
    }
  }
  return await Emulator.openUrlAsync(uri, packageName);
}

export async function openAsync({ projectRoot, uri, ...options }: Options): Promise<string> {
  let androidPackage: string | null = options.package ?? null;
  if (!androidPackage) {
    try {
      const manifestPath = getConfigPath(projectRoot);
      const manifest = await readConfigAsync(manifestPath);
      androidPackage = await getPackageAsync(manifest);
    } catch {}
  }
  return await openUrlAsync(uri, androidPackage);
}

export async function getAsync({ projectRoot }: Options): Promise<string[]> {
  const manifestPath = getConfigPath(projectRoot);
  const manifest = await readConfigAsync(manifestPath);
  return await Scheme.getSchemesFromManifest(manifest);
}

export async function getProjectIdAsync({ projectRoot }: Options): Promise<string> {
  const manifestPath = getConfigPath(projectRoot);
  const manifest = await readConfigAsync(manifestPath);
  const androidPackage = await getPackageAsync(manifest);
  if (!androidPackage)
    throw new CommandError(
      `Android: Failed to resolve android package for Manifest at path: ${manifestPath}`
    );
  return androidPackage;
}

export function getConfigPath(projectRoot: string): string {
  const rnManifestPaths = sync(path.join(projectRoot, 'android/app/src/main/AndroidManifest.xml'));
  if (rnManifestPaths.length) {
    return rnManifestPaths[0];
  }
  const manifestPaths = sync(path.join(projectRoot, 'app/src/main/AndroidManifest.xml'));
  return manifestPaths[0];
}

async function readConfigAsync(path: string): Promise<any> {
  let androidManifestJSON = await readAndroidManifestAsync(path);
  return androidManifestJSON;
}

async function writeConfigAsync(path: string, result: any) {
  await writeAndroidManifestAsync(path, result);
}
