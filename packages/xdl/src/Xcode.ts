import { execSync } from 'child_process';

import { Logger } from './internal';

// Based on the RN docs (Aug 2020).
export const minimumVersion = 9.4;
export const appStoreId = '497799835';

export function getXcodeVersion(): string | null {
  try {
    const last = execSync('xcodebuild -version', { stdio: 'pipe' })
      .toString()
      .match(/^Xcode (\d+\.\d+)/)?.[1];
    // Convert to a semver string
    if (last) {
      return `${last}.0`;
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
export function openAppStore(appId: string) {
  const link = getAppStoreLink(appId);
  execSync(`open ${link}`, { stdio: 'ignore' });
}

function getAppStoreLink(appId: string): string {
  if (process.platform === 'darwin') {
    // TODO: Is there ever a case where the macappstore isn't available on mac?
    return `macappstore://itunes.apple.com/app/id${appId}`;
  }
  return `https://apps.apple.com/us/app/id${appId}`;
}
