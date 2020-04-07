import {
  formatAndroidManifest,
  getPackageAsync,
  readAndroidManifestAsync,
  writeAndroidManifestAsync,
} from '@expo/config/build/android/Manifest';
import * as Scheme from '@expo/config/build/android/Scheme';
import spawnAsync from '@expo/spawn-async';
import chalk from 'chalk';
import { sync } from 'glob';
import path from 'path';

import { CommandError, Options } from './Options';

const CANT_START_ACTIVITY_ERROR = 'Activity not started, unable to resolve Intent';
const BEGINNING_OF_ADB_ERROR_MESSAGE = 'error: ';

export function isAvailable(projectRoot: string): boolean {
  const reactNativeAndroid = sync(
    path.join(projectRoot, 'android/app/src/main/AndroidManifest.xml')
  );
  const currentAndroid = sync(path.join(projectRoot, 'app/src/main/AndroidManifest.xml'));
  return !!currentAndroid.length || !!reactNativeAndroid.length;
}

export async function addAsync({ dryRun, uri, projectRoot }: Options): Promise<void> {
  const manifestPath = getConfigPath(projectRoot);
  let manifest = readConfigAsync(manifestPath);

  if (!Scheme.ensureManifestHasValidIntentFilter(manifest)) {
    throw new CommandError(
      `Cannot add scheme "${uri}" because the provided manifest does not have a valid Activity with \`android:launchMode="singleTask"\``,
      'add'
    );
  }
  if (Scheme.hasScheme(uri, manifest)) {
    throw new CommandError(
      `Android: URI scheme "${uri}" already exists in AndroidManifest.xml at: ${manifestPath}`,
      'add'
    );
  }

  manifest = Scheme.appendScheme(uri, manifest);

  if (dryRun) {
    console.log(chalk.magenta('Write manifest to: ', manifestPath));
    console.log(formatAndroidManifest(manifest));
    return;
  }
  await writeConfigAsync(manifestPath, manifest);
}

export async function removeAsync({ dryRun, uri, projectRoot }: Options): Promise<void> {
  const manifestPath = getConfigPath(projectRoot);
  let manifest = readConfigAsync(manifestPath);

  if (!Scheme.ensureManifestHasValidIntentFilter(manifest)) {
    throw new CommandError(
      `Cannot remove scheme "${uri}" because the provided manifest does not have a valid Activity with \`android:launchMode="singleTask"\``,
      'remove'
    );
  }

  if (Scheme.hasScheme(uri, manifest)) {
    throw new CommandError(
      `Android: URI scheme "${uri}" does not exist in AndroidManifest.xml at: ${manifestPath}`,
      'remove'
    );
  }

  manifest = Scheme.removeScheme(uri, manifest);

  if (dryRun) {
    console.log(chalk.magenta('Write manifest to: ', manifestPath));
    console.log(formatAndroidManifest(manifest));
    return;
  }
  await writeConfigAsync(manifestPath, manifest);
}

function whichADB(): string {
  if (process.env.ANDROID_HOME) {
    return `${process.env.ANDROID_HOME}/platform-tools/adb`;
  }
  return 'adb';
}

export async function getAdbOutputAsync(args: string[]): Promise<string> {
  const adb = whichADB();

  try {
    let result = await spawnAsync(adb, args);
    return result.stdout;
  } catch (e) {
    const err = e.stderr || e.stdout;
    let errorMessage = err?.trim();
    if (errorMessage.startsWith(BEGINNING_OF_ADB_ERROR_MESSAGE)) {
      errorMessage = errorMessage.substring(BEGINNING_OF_ADB_ERROR_MESSAGE.length);
    }
    throw new Error(errorMessage);
  }
}

async function openUrlAsync(...props: (string | null)[]): Promise<string> {
  const output = await getAdbOutputAsync([
    'shell',
    'am',
    'start',
    '-a',
    'android.intent.action.VIEW',
    '-d',
    ...(props.filter(Boolean) as string[]),
  ]);
  if (output.includes(CANT_START_ACTIVITY_ERROR)) {
    throw new Error(output.substring(output.indexOf('Error: ')));
  }

  return output;
}

export async function openAsync({ projectRoot, uri }: Options): Promise<string> {
  const manifestPath = getConfigPath(projectRoot);
  let androidPackage: string | null = null;
  try {
    androidPackage = await getPackageAsync({ manifestPath });
  } catch {}
  return await openUrlAsync(uri, androidPackage);
}

export async function getAsync({ projectRoot }: Options): Promise<string[]> {
  const manifestPath = getConfigPath(projectRoot);
  const manifest = readConfigAsync(manifestPath);
  return await Scheme.getSchemesFromManifest(manifest);
}

export async function getProjectIdAsync({ projectRoot }: Options): Promise<string> {
  const manifestPath = getConfigPath(projectRoot);
  const androidPackage = await getPackageAsync({ manifestPath });
  if (!androidPackage)
    throw new Error(
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
