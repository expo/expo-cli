import { getSchemesAsync, modifySchemesAsync } from '@expo/config/build/android/Schemes';
import { getPackageAsync } from '@expo/config/build/android/Manifest';
import spawnAsync from '@expo/spawn-async';
import { sync } from 'glob';
import path from 'path';

import { Options } from './Options';

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

export async function openAsync({ projectRoot, uri }: Options): Promise<void> {
  const manifestPath = getConfigPath(projectRoot);
  const androidPackage = await getPackageAsync({ manifestPath });
  if (!androidPackage) throw new Error('Android: Failed to resolve android package');
  await spawnAsync(
    'adb',
    [
      'shell',
      'am',
      'start',
      '-W',
      '-a',
      'android.intent.action.VIEW',
      '-d',
      `"${uri}"`,
      androidPackage,
    ],
    { stdio: 'inherit' }
  );
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
