import { ExpoConfig } from '@expo/config-types';

import { createInfoPlistPlugin } from '../plugins/ios-plugins';
import { gteSdkVersion } from '../utils/versions';
import * as WarningAggregator from '../utils/warnings';
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

const requiredIPadInterface = [
  'UIInterfaceOrientationPortrait',
  'UIInterfaceOrientationPortraitUpsideDown',
  'UIInterfaceOrientationLandscapeLeft',
  'UIInterfaceOrientationLandscapeRight',
];

// Whether requires full screen on iPad
export function setRequiresFullScreen(
  config: Pick<ExpoConfig, 'ios'>,
  infoPlist: InfoPlist
): InfoPlist {
  const requiresFullScreen = getRequiresFullScreen(config);
  if (!requiresFullScreen) {
    if (Array.isArray(infoPlist['UISupportedInterfaceOrientations~ipad'])) {
      if (
        !(infoPlist['UISupportedInterfaceOrientations~ipad'] as string[]).every(mask =>
          requiredIPadInterface.includes(mask)
        )
      ) {
        WarningAggregator.addWarningIOS(
          'ios.requireFullScreen',
          `iPad multitasking requires all UISupportedInterfaceOrientations~ipad to be defined. The Info.plist currently defines insufficient values that will be overwritten. Existing: ${infoPlist[
            'UISupportedInterfaceOrientations~ipad'
          ].join(', ')}`
        );
      }
    }
    // Require full screen being disabled requires all ipad interfaces to to be added, otherwise submissions to the store will fail.
    // For issue searching:
    // ERROR ITMS-90474: "Invalid Bundle. iPad Multitasking support requires these orientations: 'UIInterfaceOrientationPortrait,UIInterfaceOrientationPortraitUpsideDown,UIInterfaceOrientationLandscapeLeft,UIInterfaceOrientationLandscapeRight'. Found 'UIInterfaceOrientationPortrait,UIInterfaceOrientationPortraitUpsideDown' in bundle 'com.bacon.app'."
    infoPlist['UISupportedInterfaceOrientations~ipad'] = requiredIPadInterface;

    // There currently exists no mechanism to safely undo this feature.
  }

  return {
    ...infoPlist,
    UIRequiresFullScreen: requiresFullScreen,
  };
}
