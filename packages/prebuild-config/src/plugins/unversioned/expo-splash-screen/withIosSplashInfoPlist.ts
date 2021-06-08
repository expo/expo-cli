import {
  ConfigPlugin,
  InfoPlist,
  IOSConfig,
  WarningAggregator,
  withInfoPlist,
} from '@expo/config-plugins';
import { ExpoConfig } from '@expo/config-types';
import Debug from 'debug';

import { IOSSplashConfig } from './getIosSplashConfig';

const debug = Debug('@expo/prebuild-config:expo-splash-screen:ios:infoPlist');

export const withIosSplashInfoPlist: ConfigPlugin<IOSSplashConfig> = (config, splash) => {
  return withInfoPlist(config, config => {
    config.modResults = setSplashInfoPlist(config, config.modResults, splash);
    return config;
  });
};

export function setSplashInfoPlist(
  config: ExpoConfig,
  infoPlist: InfoPlist,
  splash: IOSSplashConfig
): InfoPlist {
  const isDarkModeEnabled = !!(
    splash?.dark?.image ||
    splash?.dark?.tabletImage ||
    splash?.dark?.backgroundColor ||
    splash?.dark?.tabletBackgroundColor
  );
  debug(`isDarkModeEnabled: `, isDarkModeEnabled);

  if (isDarkModeEnabled) {
    const existing = IOSConfig.UserInterfaceStyle.getUserInterfaceStyle(config);
    // Add a warning to prevent the dark mode splash screen from not being shown -- this was learned the hard way.
    if (existing && existing !== 'automatic') {
      WarningAggregator.addWarningIOS(
        'splash',
        'The existing `userInterfaceStyle` property is preventing splash screen from working properly. Please remove it or disable dark mode splash screens.'
      );
    }
    // assigning it to auto anyways, but this is fragile because the order of operations matter now
    infoPlist.UIUserInterfaceStyle = 'Automatic';
  } else {
    delete infoPlist.UIUserInterfaceStyle;
  }

  if (splash) {
    // TODO: What to do here ??
    infoPlist.UILaunchStoryboardName = 'SplashScreen';
  } else {
    debug(`Disabling UILaunchStoryboardName`);
    delete infoPlist.UILaunchStoryboardName;
  }

  return infoPlist;
}
