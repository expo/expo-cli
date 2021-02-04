import { ModPlatform } from '@expo/config-plugins';

import CommandError from '../../CommandError';
import Log from '../../log';

function getDefaultPlatforms(): ModPlatform[] {
  const platforms: ModPlatform[] = ['android'];
  if (process.platform !== 'win32') {
    platforms.push('ios');
  }
  return platforms;
}

export function platformsFromPlatform(platform?: string): ModPlatform[] {
  if (!platform) {
    return getDefaultPlatforms();
  }
  switch (platform) {
    case 'ios':
      if (process.platform === 'win32') {
        Log.warn('Ejecting is unsupported locally on windows, use eas build instead');
        // continue anyways :shrug:
      }
      return ['ios'];
    case 'android':
      return ['android'];
    case 'all':
      return getDefaultPlatforms();
    default:
      throw new CommandError(`Unsupported platform "${platform}". Options are: ios, android, all`);
  }
}
