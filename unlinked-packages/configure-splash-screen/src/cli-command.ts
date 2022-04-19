import { Command } from 'commander';

import { AndroidSplashScreenConfigJSON, IosSplashScreenConfigJSON } from './SplashScreenConfig';
import configureAndroid from './android';
import {
  SplashScreenImageResizeMode,
  SplashScreenStatusBarStyle,
  Platform,
  PlatformType,
} from './constants';
import configureIos from './ios';
import { validateEnumValue } from './validators';

type RawCLIOptions = Partial<{
  imageResizeMode: string;
  platform: string;
  backgroundColor: string;
  imagePath: string;
  darkModeBackgroundColor: string;
  darkModeImagePath: string;
  statusBarHidden: boolean;
  statusBarStyle: string;
  darkModeStatusBarStyle: string;
  statusBarTranslucent: boolean;
  statusBarBackgroundColor: string;
  darkModeStatusBarBackgroundColor: string;
}>;

interface Configuration {
  platform: PlatformType;
  android: AndroidSplashScreenConfigJSON;
  ios: IosSplashScreenConfigJSON;
}

async function action(configuration: Configuration) {
  const { platform, android, ios } = configuration;
  const rootDir = process.cwd();
  switch (platform) {
    case Platform.ANDROID:
      await configureAndroid(rootDir, android);
      break;
    case Platform.IOS:
      await configureIos(rootDir, ios);
      break;
    case Platform.ALL:
    default:
      await configureAndroid(rootDir, android);
      await configureIos(rootDir, ios);
      break;
  }
}

function configurationFromOptions({
  platform,
  imageResizeMode,
  backgroundColor,
  imagePath,
  statusBarHidden,
  statusBarStyle,
  statusBarTranslucent,
  statusBarBackgroundColor,
  darkModeBackgroundColor,
  darkModeImagePath,
  darkModeStatusBarStyle,
  darkModeStatusBarBackgroundColor,
}: RawCLIOptions): Configuration {
  let resolvedPlatform: PlatformType = Platform.ALL;
  try {
    resolvedPlatform = (platform && validateEnumValue(platform, Platform)) || Platform.ALL;
  } catch (e: any) {
    throw new Error(`'platform': ${e.message}`);
  }

  if (!backgroundColor) {
    throw new Error(
      `'backgroundColor': Required option is not provided. Provide a valid color string.`
    );
  }

  const resolvedStatusBarHidden =
    statusBarHidden === undefined ? undefined : Boolean(statusBarHidden);
  const resolvedStatusBarTranslucent =
    statusBarTranslucent === undefined ? undefined : Boolean(statusBarTranslucent);

  const genericConfig = {
    imageResizeMode,
    backgroundColor,
    image: imagePath,
  };
  const genericStatusBarConfig = {
    hidden: resolvedStatusBarHidden,
    style: statusBarStyle,
  };
  const genericDarkModeConfig = {
    backgroundColor: darkModeBackgroundColor,
    image: darkModeImagePath,
  };

  const result: Configuration = {
    platform: resolvedPlatform,
    android: {
      ...genericConfig,
      statusBar: {
        ...genericStatusBarConfig,
        translucent: resolvedStatusBarTranslucent,
        backgroundColor: statusBarBackgroundColor,
      },
      darkMode: {
        ...genericDarkModeConfig,
        statusBar: {
          style: darkModeStatusBarStyle,
          backgroundColor: darkModeStatusBarBackgroundColor,
        },
      },
    },
    ios: {
      ...genericConfig,
      statusBar: genericStatusBarConfig,
      darkMode: genericDarkModeConfig,
    },
  };

  return result;
}

function getAvailableOptions(o: object) {
  return Object.values(o)
    .map(v => `"${v}"`)
    .join(' | ');
}

export default () =>
  new Command()
    .description(
      'Idempotent operation that configures native splash screens using provided backgroundColor and optional .png file. Supports light and dark modes configuration. Dark mode is supported only on iOS 13+ and Android 10+.'
    )
    .version(require('../package.json').version)
    .allowUnknownOption(false)
    .passCommandToAction(false)
    .option(
      '-p, --platform <platform>',
      `Selected platform to configure. Available values: ${getAvailableOptions(
        Platform
      )} (default: "${Platform.ALL}").`
    )
    .option(
      '-b, --background-color <color>',
      `(required) Valid css-formatted color (hex (#RRGGBB[AA]), rgb[a], hsl[a], named color (https://drafts.csswg.org/css-color/#named-colors)) that would be used as the background color for native splash screen view.`
    )
    .option(
      '-i, --image-path <path>',
      'Path to valid .png image that will be displayed on the splash screen.'
    )
    .option(
      '-r, --image-resize-mode <resizeMode>',
      `Resize mode to be used for the splash screen image. Available only if 'image-path' is provided as well. Available values: ${getAvailableOptions(
        SplashScreenImageResizeMode
      )} ("native" is only available for Android)) (default: "${
        SplashScreenImageResizeMode.CONTAIN
      }").`
    )
    .option(
      '--dark-mode-background-color <color>',
      `Color (see 'background-color' supported formats) that would be used as the background color for the splash screen in dark mode. Providing this option enables other dark-mode related options.`
    )
    .option(
      '--dark-mode-image-path <path>',
      `Path to valid .png image that will be displayed on the splash screen in dark mode only. Available only if 'dark-mode-background-color' is provided as well.`
    )
    .option(
      '--status-bar-style <style>',
      `Customizes the color of the status bar icons. Available values: ${getAvailableOptions(
        SplashScreenStatusBarStyle
      )} (default: "${SplashScreenStatusBarStyle.DEFAULT}").`
    )
    .option('--status-bar-hidden', `Hides the status bar.`)
    .option(
      '--status-bar-background-color <color>',
      `(only for Android platform) Customizes the background color of the status bar. Accepts a valid color (see 'background-color' supported formats).`
    )
    .option(
      '--status-bar-translucent',
      `(only for Android platform) Makes the status bar translucent (enables drawing under the status bar area).`
    )
    .option(
      '--dark-mode-status-bar-style <style>',
      `(only for Android platform) The same as 'status-bar-style', but applied only in dark mode. Available only if 'dark-mode-background-color' and 'status-bar-style' are provided as well.`
    )
    .option(
      '--dark-mode-status-bar-background-color <color>',
      `(only for Android platform) The same as 'status-bar-background-color', but applied only in the dark mode. Available only if 'dark-mode-background-color' and 'status-bar-style' are provided as well.`
    )
    .action(async (options: RawCLIOptions) => {
      const configuration = configurationFromOptions(options);
      await action(configuration);
    });
