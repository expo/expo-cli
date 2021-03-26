import spawnAsync from '@expo/spawn-async';

import { Logger } from './internal';

// Based on the RN docs (Aug 2020).
export const minimumVersion = 9.4;
export const appStoreId = '497799835';

export async function getXcodeVersionAsync(): Promise<string | null> {
  try {
    const { stdout } = await spawnAsync('xcodebuild', ['-version']);

    const match = stdout.match(/^Xcode (\d+\.\d+)/);
    if (match?.length) {
      const last = match.pop();
      // Convert to a semver string
      if (last) {
        return `${last}.0`;
      }
      return null;
    }

    // not sure what's going on
    Logger.global.error(
      'Unable to check Xcode version. Command ran successfully but no version number was found.'
    );
  } catch {
    // not installed
  }
  return null;
}

/**
 * Open a link to the App Store. Just link in mobile apps, **never** redirect without prompting first.
 *
 * @param appId
 */
export async function openAppStoreAsync(appId: string): Promise<void> {
  const link = getAppStoreLink(appId);
  await spawnAsync('open', [link]);
}

function getAppStoreLink(appId: string): string {
  if (process.platform === 'darwin') {
    // TODO: Is there ever a case where the macappstore isn't available on mac?
    return `macappstore://itunes.apple.com/app/id${appId}`;
  }
  return `https://apps.apple.com/us/app/id${appId}`;
}
