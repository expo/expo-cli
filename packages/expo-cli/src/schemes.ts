import { getConfig } from '@expo/config';
import { AndroidConfig, IOSConfig } from '@expo/config-plugins';
import plist from '@expo/plist';
import fs from 'fs';
import resolveFrom from 'resolve-from';

import { AbortCommandError } from './CommandError';
import {
  hasRequiredAndroidFilesAsync,
  hasRequiredIOSFilesAsync,
} from './commands/eject/clearNativeFolder';
import Log from './log';

export async function getSchemesForIosAsync(projectRoot: string) {
  try {
    const configPath = IOSConfig.Paths.getInfoPlistPath(projectRoot);
    const rawPlist = fs.readFileSync(configPath, 'utf8');
    const plistObject = plist.parse(rawPlist);
    return sortLongest(IOSConfig.Scheme.getSchemesFromPlist(plistObject));
  } catch {
    // No ios folder or some other error
    return [];
  }
}

export async function getSchemesForAndroidAsync(projectRoot: string) {
  try {
    const configPath = await AndroidConfig.Paths.getAndroidManifestAsync(projectRoot);
    const manifest = await AndroidConfig.Manifest.readAndroidManifestAsync(configPath);
    return sortLongest(await AndroidConfig.Scheme.getSchemesFromManifest(manifest));
  } catch {
    // No android folder or some other error
    return [];
  }
}

function intersecting<T>(a: T[], b: T[]): T[] {
  const [c, d] = a.length > b.length ? [a, b] : [b, a];
  return c.filter(value => d.includes(value));
}

export async function getDevClientSchemeAsync(projectRoot: string): Promise<string> {
  const [hasIos, hasAndroid] = await Promise.all([
    hasRequiredIOSFilesAsync(projectRoot),
    hasRequiredAndroidFilesAsync(projectRoot),
  ]);

  const [ios, android] = await Promise.all([
    getSchemesForIosAsync(projectRoot),
    getSchemesForAndroidAsync(projectRoot),
  ]);

  // Allow managed projects
  if (!hasIos && !hasAndroid) {
    return getManagedDevClientSchemeAsync(projectRoot);
  }

  let matching: string;
  // Allow for only one native project to exist.
  if (!hasIos) {
    matching = android[0];
  } else if (!hasAndroid) {
    matching = ios[0];
  } else {
    [matching] = intersecting(ios, android);
  }

  if (!matching) {
    Log.warn(
      '\nDev Client: No common URI schemes could be found for the native iOS and Android projects, this is required for opening the project\n'
    );
    Log.log(
      `Add a common scheme with ${Log.chalk.cyan(
        'npx uri-scheme add my-scheme'
      )} or provide a scheme with the ${Log.chalk.cyan('--scheme')} flag\n`
    );
    Log.log(
      Log.chalk.dim(
        `You can see all of the existing schemes for your native projects by running ${Log.chalk.cyan(
          'npx uri-scheme list'
        )}\n`
      )
    );

    // No log error
    throw new AbortCommandError();
  }
  return matching;
}

async function getManagedDevClientSchemeAsync(projectRoot: string): Promise<string> {
  const { exp } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
  });
  try {
    const getDefaultScheme = require(resolveFrom(projectRoot, 'expo-dev-client/getDefaultScheme'));
    const scheme = getDefaultScheme(exp);
    return scheme;
  } catch (error) {
    Log.warn(
      '\nDev Client: Unable to get the default URI scheme for the project. Please make sure the expo-dev-client package is installed.'
    );
    Log.error(error);
    Log.newLine();
    throw new AbortCommandError();
  }
}

// sort longest to ensure uniqueness.
// this might be undesirable as it causes the QR code to be longer.
function sortLongest(obj: string[]): string[] {
  return obj.sort((a, b) => b.length - a.length);
}
