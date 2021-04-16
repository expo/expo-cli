import { ExpoConfig } from '@expo/config-types';
import {
  configureIosSplashScreen,
  IosSplashScreenConfig,
  SplashScreenImageResizeMode,
} from '@expo/configure-splash-screen';

import { ConfigPlugin } from '../Plugin.types';
import { withDangerousMod } from '../plugins/core-plugins';
import * as WarningAggregator from '../utils/warnings';

export const withSplashScreen: ConfigPlugin = config => {
  return withDangerousMod(config, [
    'ios',
    async config => {
      await setSplashScreenAsync(config, config.modRequest.projectRoot);
      return config;
    },
  ]);
};

export function getSplashScreen(config: ExpoConfig): IosSplashScreenConfig | undefined {
  if (!config.splash && !config.ios?.splash) {
    return;
  }

  const result: IosSplashScreenConfig = {
    imageResizeMode:
      config.ios?.splash?.resizeMode ??
      config.splash?.resizeMode ??
      SplashScreenImageResizeMode.CONTAIN,
    backgroundColor:
      config.ios?.splash?.backgroundColor ?? config.splash?.backgroundColor ?? '#FFFFFF', // white
    image: config.ios?.splash?.image ?? config.splash?.image,
  };

  return result;
}

export async function setSplashScreenAsync(config: ExpoConfig, projectRoot: string) {
  const majorVersionString = config.sdkVersion?.split('.').shift();
  const splashScreenIsSupported =
    (majorVersionString && Number(majorVersionString) >= 39) ||
    /** UNVERSIONED CASE */ !majorVersionString;

  if (!splashScreenIsSupported) {
    WarningAggregator.addWarningIOS(
      'splash',
      'Unable to automatically configure splash screen. Please refer to the expo-splash-screen README for more information: https://github.com/expo/expo/tree/master/packages/expo-splash-screen'
    );
    return;
  }

  const splashConfig = getSplashScreen(config);

  if (!splashConfig) {
    return;
  }
  try {
    await configureIosSplashScreen(projectRoot, splashConfig);
  } catch (e) {
    WarningAggregator.addWarningIOS('splash', e);
  }
}
