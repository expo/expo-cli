import { getSchemesAsync, modifySchemesAsync } from '@expo/config/build/android/Schemes';
import { getPackageAsync } from '@expo/config/build/android/Manifest';
import spawnAsync from '@expo/spawn-async';
import { sync } from 'glob';
import path from 'path';

import { Options } from './Options';

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
  await modifySchemesAsync({ manifestPath }, { uri }, { operation: 'add', dryRun });
}

export async function removeAsync({ dryRun, uri, projectRoot }: Options): Promise<void> {
  const manifestPath = getConfigPath(projectRoot);
  await modifySchemesAsync({ manifestPath }, { uri }, { operation: 'remove', dryRun });
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
  const androidPackage = await getPackageAsync({ manifestPath });
  return await openUrlAsync(uri, androidPackage);
}

export async function getAsync({ projectRoot }: Options): Promise<string[]> {
  const manifestPath = getConfigPath(projectRoot);
  return await getSchemesAsync({ manifestPath });
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
