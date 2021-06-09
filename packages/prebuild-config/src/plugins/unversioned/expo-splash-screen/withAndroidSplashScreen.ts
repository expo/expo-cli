import { ConfigPlugin, WarningAggregator, withDangerousMod } from '@expo/config-plugins';
import { ExpoConfig } from '@expo/config-types';
import {
  AndroidSplashScreenConfig,
  configureAndroidSplashScreen,
  SplashScreenImageResizeMode,
} from '@expo/configure-splash-screen';

export const withAndroidSplashScreen: ConfigPlugin = config => {
  return withDangerousMod(config, [
    'android',
    async config => {
      // Update the android status bar to match the splash screen
      // androidStatusBar applies info to the app activity style.
      const backgroundColor = getSplashBackgroundColor(config);
      if (config.androidStatusBar?.backgroundColor) {
        if (
          backgroundColor.toLowerCase() !== config.androidStatusBar?.backgroundColor.toLowerCase()
        ) {
          WarningAggregator.addWarningAndroid(
            'androidStatusBar.backgroundColor',
            'The androidStatusBar.backgroundColor color conflicts with the splash backgroundColor on Android'
          );
        }
      } else {
        if (!config.androidStatusBar) config.androidStatusBar = {};
        config.androidStatusBar.backgroundColor = backgroundColor;
      }
      await setSplashScreenAsync(config, config.modRequest.projectRoot);
      return config;
    },
  ]);
};

function getSplashBackgroundColor(config: ExpoConfig) {
  const backgroundColor =
    config.android?.splash?.backgroundColor ?? config.splash?.backgroundColor ?? '#FFFFFF'; // white
  return backgroundColor;
}

export function getSplashScreenConfig(config: ExpoConfig): AndroidSplashScreenConfig | undefined {
  if (!config.splash && !config.android?.splash) {
    return;
  }

  const backgroundColor = getSplashBackgroundColor(config);

  const result: AndroidSplashScreenConfig = {
    imageResizeMode:
      config.android?.splash?.resizeMode ??
      config.splash?.resizeMode ??
      SplashScreenImageResizeMode.CONTAIN,
    backgroundColor,
    image:
      config.android?.splash?.xxxhdpi ??
      config.android?.splash?.xxhdpi ??
      config.android?.splash?.xhdpi ??
      config.android?.splash?.hdpi ??
      config.android?.splash?.mdpi ??
      config.splash?.image,
    statusBar: {
      backgroundColor,
      // Use the settings from androidStatusBar to keep the transition as smooth as possible.
      hidden: config.androidStatusBar?.hidden,
      translucent: config.androidStatusBar?.translucent,
      style: config.androidStatusBar?.barStyle,
    },
  };

  return result;
}

export async function setSplashScreenAsync(config: ExpoConfig, projectRoot: string) {
  const majorVersionString =
    config.sdkVersion === 'UNVERSIONED' ? null : config.sdkVersion?.split('.').shift();
  const splashScreenIsSupported =
    (majorVersionString && Number(majorVersionString) >= 39) ||
    /** UNVERSIONED CASE */ !majorVersionString;

  if (!splashScreenIsSupported) {
    WarningAggregator.addWarningAndroid(
      'splash',
      `Unable to automatically configure splash screen. Automatic splash screen configuration is available since SDK 39. Please upgrade to the newer SDK version. Please refer to the expo-splash-screen README for more information: https://github.com/expo/expo/tree/master/packages/expo-splash-screen`
    );

    return;
  }

  const splashConfig = getSplashScreenConfig(config);
  if (!splashConfig) {
    return;
  }

  try {
    await configureAndroidSplashScreen(projectRoot, splashConfig);
  } catch (e) {
    WarningAggregator.addWarningAndroid('splash', e);
  }
}
