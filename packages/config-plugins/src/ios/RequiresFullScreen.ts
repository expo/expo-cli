import { ExpoConfig } from '@expo/config-types';

import { createInfoPlistPlugin } from '../plugins/ios-plugins';
import { gteSdkVersion } from '../utils/versions';
import { InfoPlist } from './IosConfig.types';

export const withRequiresFullScreen = createInfoPlistPlugin(
  setRequiresFullScreen,
  'withRequiresFullScreen'
);

// NOTES: This is defaulted to `true` for now to match the behavior prior to SDK
// 34, but will change to `false` in SDK +43.
export function getRequiresFullScreen(config: Pick<ExpoConfig, 'ios' | 'sdkVersion'>) {
  // Yes, the property is called ios.requireFullScreen, without the s - not "requires"
  // This is confusing indeed because the actual property name does have the s
  if (config.ios?.hasOwnProperty('requireFullScreen')) {
    return !!config.ios.requireFullScreen;
  } else {
    // In SDK 43, the `requireFullScreen` default has been changed to false.
    if (
      gteSdkVersion(config, '43.0.0')
      // TODO: Uncomment after SDK 43 is released.
      // || !config.sdkVersion
    ) {
      return false;
    }
    return true;
  }
}

// Whether requires full screen on iPad
export function setRequiresFullScreen(
  config: Pick<ExpoConfig, 'ios'>,
  infoPlist: InfoPlist
): InfoPlist {
  return {
    ...infoPlist,
    UIRequiresFullScreen: getRequiresFullScreen(config),
  };
}
