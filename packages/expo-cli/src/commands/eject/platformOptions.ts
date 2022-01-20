import { ModPlatform } from '@expo/config-plugins';
import chalk from 'chalk';

import CommandError from '../../CommandError';
import Log from '../../log';

export function platformsFromPlatform(
  platform: string = 'all',
  { loose }: { loose?: boolean } = {}
): ModPlatform[] {
  switch (platform) {
    case 'ios':
      if (process.platform === 'win32' && !loose) {
        Log.warn('Prebuilding is unsupported locally on windows, use eas build instead');
        // continue anyways :shrug:
      }
      return ['ios'];
    case 'android':
      return ['android'];
    case 'all':
      if (loose || process.platform !== 'win32') {
        return ['android', 'ios'];
      }
      return ['android'];
    default:
      throw new CommandError(`Unsupported platform "${platform}". Options are: ios, android, all`);
  }
}

export function ensureValidPlatforms(platforms: ModPlatform[]): ModPlatform[] {
  const isWindows = process.platform === 'win32';
  // Skip prebuilding for iOS on Windows
  if (isWindows && platforms.includes('ios')) {
    Log.warn(
      `⚠️  Skipping generating the iOS native project files. Run ${chalk.bold(
        'expo prebuild'
      )} again from macOS or Linux to generate the iOS project.`
    );
    Log.newLine();
    return platforms.filter(platform => platform !== 'ios');
  }
  return platforms;
}

export function assertPlatforms(platforms: ModPlatform[]) {
  if (!platforms?.length) {
    throw new CommandError('At least one platform must be enabled when syncing');
  }
}
