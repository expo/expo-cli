import { ConfigPlugin, withPlugins } from '@expo/config-plugins';
import Debug from 'debug';

import {
  getIosSplashConfig,
  IOSSplashConfig,
  warnUnsupportedSplashProperties,
} from './getIosSplashConfig';
import { withIosSplashAssets } from './withIosSplashAssets';
import { withIosSplashInfoPlist } from './withIosSplashInfoPlist';
import { withIosSplashXcodeProject } from './withIosSplashXcodeProject';

const debug = Debug('@expo/prebuild-config:expo-splash-screen:ios');

export const withIosSplashScreen: ConfigPlugin<IOSSplashConfig | undefined | null | void> = (
  config,
  splash
) => {
  // only warn once
  warnUnsupportedSplashProperties(config);

  // If the user didn't specify a splash object, infer the splash object from the Expo config.
  if (!splash) {
    splash = getIosSplashConfig(config);
  } else {
    debug(`custom splash config provided`);
  }

  debug(`config:`, splash);

  return withPlugins(config, [
    [withIosSplashInfoPlist, splash],
    [withIosSplashAssets, splash],
    [withIosSplashXcodeProject, splash],
  ]);
};
