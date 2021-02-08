import { AndroidConfig, IOSConfig } from '@expo/config-plugins';
import plist from '@expo/plist';
import * as fs from 'fs-extra';

import { AbortCommandError } from './CommandError';
import Log from './log';

async function getSchemesForIosAsync(projectRoot: string) {
  try {
    const configPath = IOSConfig.Paths.getInfoPlistPath(projectRoot);
    const rawPlist = fs.readFileSync(configPath, 'utf8');
    const plistObject = plist.parse(rawPlist);
    return IOSConfig.Scheme.getSchemesFromPlist(plistObject);
  } catch {
    // No ios folder or some other error
    return [];
  }
}

async function getSchemesForAndroidAsync(projectRoot: string) {
  try {
    const configPath = await AndroidConfig.Paths.getAndroidManifestAsync(projectRoot);
    const manifest = await AndroidConfig.Manifest.readAndroidManifestAsync(configPath);
    return await AndroidConfig.Scheme.getSchemesFromManifest(manifest);
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
  const [ios, android] = await Promise.all([
    getSchemesForIosAsync(projectRoot),
    getSchemesForAndroidAsync(projectRoot),
  ]);

  const [matching] = intersecting(ios, android);
  if (!matching) {
    Log.warn(
      '\nDev Client: No common URI schemes could be found for the native ios and android projects, this is required for opening the project\n'
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
