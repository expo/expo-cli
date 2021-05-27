import { getConfig } from '@expo/config';
import { AndroidConfig, IOSConfig } from '@expo/config-plugins';
import JsonFile from '@expo/json-file';
import plist from '@expo/plist';
import fs from 'fs';
import path from 'path';
import slugify from 'slugify';

import { AbortCommandError } from './CommandError';
import {
  hasRequiredAndroidFilesAsync,
  hasRequiredIOSFilesAsync,
} from './commands/eject/clearNativeFolder';
import Log from './log';
import prompt from './prompts';

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
  const { exp, staticConfigPath, dynamicConfigPath } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
  });
  if (exp.scheme) {
    return exp.scheme;
  }

  Log.warn(
    '\nDev Client: No URI schemes could be found in configuration, this is required for opening the project\n'
  );
  if (dynamicConfigPath && !staticConfigPath) {
    // Dynamic config (app.config.js/app.config.ts) can't be automatically updated.
    Log.log(
      `Add a common scheme in ${dynamicConfigPath} or provide a scheme with the ${Log.chalk.cyan(
        '--scheme'
      )} flag\n`
    );
    throw new AbortCommandError();
  }

  const { scheme } = await prompt({
    type: 'text',
    name: 'scheme',
    validate: value =>
      /^[a-z0-9-]+$/.test(value) || 'Only lowercase characters/numbers (a-z, 0-9) or hyphen (-)',
    message: `Please choose a URI scheme for your app`,
    initial: slugify(exp.slug, {
      // Remove non-allowed characters and additionally hyphens, which are allowed but not idiomatic.
      remove: /[^a-z0-9]/,
      // Convert to lower case.
      lower: true,
    }),
  });
  if (staticConfigPath) {
    // if app.json exists we can update it
    const config = JsonFile.read(staticConfigPath, { json5: true });
    config.expo = { ...(config.expo as object), scheme };
    await JsonFile.writeAsync(staticConfigPath, config);
    Log.log(`Scheme '${scheme}' updated in ${path.basename(staticConfigPath)}`);
  } else {
    // otherwise we'll create a new app.json
    const newConfigPath = path.join(projectRoot, 'app.json');
    await JsonFile.writeAsync(newConfigPath, { expo: { scheme } });
    Log.log(`Created ${path.basename(newConfigPath)}`);
  }
  return scheme;
}

// sort longest to ensure uniqueness.
// this might be undesirable as it causes the QR code to be longer.
function sortLongest(obj: string[]): string[] {
  return obj.sort((a, b) => b.length - a.length);
}
