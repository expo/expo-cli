import { Command } from 'commander';
import path from 'path';

import configureAndroid from './android';
import configureIos from './ios';
import {
  SplashScreenImageResizeMode,
  SplashScreenStatusBarStyle,
  Platform,
  PlatformType,
} from './constants';
import { AndroidSplashScreenJsonConfig, IosSplashScreenJsonConfig } from './types';
import { validateEnumValue } from './validators';

const AVAILABLE_OPTIONS_NAMES = [
  'imageResizeMode',
  'platform',
  'backgroundColor',
  'imagePath',
  'darkModeBackgroundColor',
  'darkModeImagePath',
  'statusBarHidden',
  'statusBarStyle',
  'darkModeStatusBarStyle',
  'statusBarTranslucent',
  'statusBarBackgroundColor',
  'darkModeStatusBarBackgroundColor',
] as const;

type CLIOptionName = typeof AVAILABLE_OPTIONS_NAMES[number];

type CLIOptions = Partial<Record<CLIOptionName, string>>;

interface Configuration {
  platform: PlatformType;
  android: AndroidSplashScreenJsonConfig;
  ios: IosSplashScreenJsonConfig;
}

async function action(configuration: Configuration) {
  const { platform, android, ios } = configuration;
  const rootDir = path.resolve();
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
}: CLIOptions): Configuration {
  let resolvedPlatform: PlatformType = Platform.ALL;
  try {
    resolvedPlatform = (platform && validateEnumValue(platform, Platform)) || Platform.ALL;
  } catch (e) {
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
    imagePath,
  };
  const genericStatusBarConfig = {
    hidden: resolvedStatusBarHidden,
    style: statusBarStyle,
  };
  const genericDarkModeConfig = {
    backgroundColor: darkModeBackgroundColor,
    imagePath: darkModeImagePath,
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
    .allowUnknownOption(false)
    .passCommandToAction(false)
    .option(
      '-p, --platform <platform>',
      `Selected platform to configure. Available values: ${getAvailableOptions(Platform)}.`
    )
    .option(
      '-b, --background-color <color>',
      `Valid css-formatted color (hex (#RRGGBB[AA]), rgb[a], hsl[a], named color (https://drafts.csswg.org/css-color/#named-colors)) that would be used as the background color for native splash screen view.`
    )
    .option(
      '-i, --image-path <path>',
      'Path to valid .png image that will be displayed in native splash screen.'
    )
    .option(
      '-r, --image-resize-mode <resizeMode>',
      `ResizeMode to be used for native splash screen image. Available values: ${getAvailableOptions(
        SplashScreenImageResizeMode
      )} (only available for android platform)).`
    )
    .option(
      '--dark-mode-background-color <color>',
      `Color (see 'background-color' supported formats) that would be used as the background color for native splash screen in dark mode.`
    )
    .option(
      '--dark-mode-image-path <path>',
      'Path to valid .png image that will be displayed in native splash screen in dark mode only.'
    )
    .option(
      '--status-bar-style <style>',
      `Customizes the color of the StatusBar icons. Available values: ${getAvailableOptions(
        SplashScreenStatusBarStyle
      )}.`
    )
    .option('--status-bar-hidden', `Hides the StatusBar.`)
    .option(
      '--status-bar-background-color <color>',
      `(only for Android platform) Customizes the background color of the StatusBar. Accepts a valid color (see 'background-color' supported formats).`
    )
    .option(
      '--status-bar-translucent',
      `(only for Android platform) Makes the StatusBar translucent (enables drawing under the StatusBar area).`
    )
    .option(
      '--dark-mode-status-bar-style <style>',
      `(only for Android platform) The very same as 'statusbar-style' option, but applied only in dark mode. Available only if 'statusbar-style' is provided.`
    )
    .option(
      '--dark-mode-status-bar-background-color <color>',
      `(only for Android platform) The very same as 'status-bar-background-color', but applied only in the dark mode. Available only if 'statusbar-style' is provided.`
    )
    .action(async (options: CLIOptions) => {
      const configuration = configurationFromOptions(options);
      await action(configuration);
    });
