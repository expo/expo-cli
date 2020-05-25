#!/usr/bin/env node

import program from 'commander';
import colorString from 'color-string';
import fs from 'fs-extra';
import path from 'path';

import configureAndroid from './android';
import {
  ResizeMode,
  Platform,
  Arguments,
  StatusBarStyle,
  StatusBarOptions,
  AndroidOnlyStatusBarOptions,
} from './constants';
import configureIos from './ios';

/**
 * These might be optionally provided by the user. There are default values for them.
 */
interface Options extends StatusBarOptions, AndroidOnlyStatusBarOptions {
  resizeMode: ResizeMode;
  platform: Platform;
}

const AVAILABLE_OPTIONS_NAMES = new Set([
  'resizeMode',
  'platform',
  'statusBarHidden',
  'statusBarStyle',
  'darkModeStatusBarStyle',
  'statusBarTranslucent',
  'statusBarBackgroundColor',
  'darkModeStatusBarBackgroundColor',
]);

async function action(configuration: Arguments & Options) {
  const { platform, ...restParams } = configuration;
  const rootDir = path.resolve();
  switch (platform) {
    case Platform.ANDROID:
      await configureAndroid(rootDir, restParams);
      break;
    case Platform.IOS:
      await configureIos(rootDir, restParams);
      break;
    case Platform.ALL:
    default:
      await configureAndroid(rootDir, restParams);
      await configureIos(rootDir, restParams);
      break;
  }
}

function getAvailableOptions(o: object) {
  return Object.values(o)
    .map(v => `"${v}"`)
    .join(' | ');
}

function logErrorAndExit(errorMessage: string): never {
  console.error(errorMessage);
  process.exit(1);
}

/**
 * @param imagePath Path to a file.
 * @param parameterName Parameter name to log in error when file is not valid.
 * @returns Absolute path to the valid image file.
 */
async function validateArgumentImagePath(
  imagePath: string,
  parameterName: string
): Promise<string> {
  const resolvedImagePath = path.resolve(imagePath);
  // check if `imagePath` exists
  if (!(await fs.pathExists(resolvedImagePath))) {
    logErrorAndExit(
      `error: Invalid path '${imagePath}' for argument '${parameterName}'. File does not exist.`
    );
  }

  // check if `imagePath` is a readable .png file
  if (path.extname(resolvedImagePath) !== '.png') {
    logErrorAndExit(
      `error: Invalid path '${imagePath}' for argument '${parameterName}'. File is not a .png file.`
    );
  }
  return resolvedImagePath;
}

/**
 * Ensures following semantic requirements are met:
 * - PARAMETERS:
 *   - `backgroundColor` is valid css-formatted color
 *   - `imagePathOrDarkModeBackgroundColor` is a path to a valid .png file (then `darkMode = false`) or a valid css-formatted color for dark mode (then `darkMode = true`)
 *   - `imagePath` is present only if `darkMode = true` and then it is a path to valid .png file
 *   - `darkModeImagePath` is present only if `darkMode = true` and then it is a path to valid .png file for dark mode
 * - OPTIONS:
 *   - `resizeMode = NATIVE` is selected only with `platform = ANDROID`
 *   - `statusBarBackgroundColor` is provided only if `platform = ANDROID`
 *   - `statusBarTranslucent` is provided only if `platform = ANDROID`
 *   - `darkModeStatusBarStyle` is provided only if `darkMode = true`
 *   - `darkModeStatusBarBackgroundColor` is provided only if `platform = ANDROID` and `darkMode = true`
 */
async function validateConfiguration(
  configuration: {
    backgroundColor: string;
    imagePathOrDarkModeBackgroundColor?: string;
    imagePath?: string;
    darkModeImagePath?: string;
  } & Options
): Promise<Arguments & Options> {
  const {
    platform,
    resizeMode,
    backgroundColor,
    imagePathOrDarkModeBackgroundColor,
    imagePath,
    darkModeImagePath,
    darkModeStatusBarStyle,
    statusBarBackgroundColor,
    darkModeStatusBarBackgroundColor,
    statusBarTranslucent,
    statusBarStyle,
    statusBarHidden,
  } = configuration;

  // first argument `backgroundColor` is valid css-formatted color
  const parsedBackgroundColor = colorString.get(backgroundColor);
  if (!parsedBackgroundColor) {
    logErrorAndExit(`error: Invalid value '${backgroundColor}' for argument 'backgroundColor'.`);
  }

  const result: Arguments & Options = {
    platform,
    resizeMode,
    backgroundColor: parsedBackgroundColor,
    imagePath,
    darkModeImagePath,
    darkModeStatusBarStyle,
    statusBarBackgroundColor,
    darkModeStatusBarBackgroundColor,
    statusBarTranslucent,
    statusBarStyle,
    statusBarHidden,
  };

  let darkMode = false;

  // `imagePathOrDarkModeBackgroundColor` is a path to a valid .png file (then `darkMode = false`) or a valid css-formatted color for dark mode (then `darkMode = true`)
  if (imagePathOrDarkModeBackgroundColor) {
    const parsedDarkModeBackgroundColor = colorString.get(imagePathOrDarkModeBackgroundColor);
    if (parsedDarkModeBackgroundColor) {
      darkMode = true;
      result.darkModeBackgroundColor = parsedDarkModeBackgroundColor;
    } else {
      darkMode = false;
      // it's not a color, then it should be a path to an image file
      result.imagePath = await validateArgumentImagePath(
        imagePathOrDarkModeBackgroundColor,
        'imagePathOrDarkModeBackgroundColor'
      );
    }
  }

  // `imagePath` is present only if `darkMode = true` and then it is a path to valid .png file
  if (imagePath) {
    if (!darkMode) {
      logErrorAndExit(
        `error: As the second argument is recognized as a path to an image file, dark mode is not enabled and no more arguments are expected.`
      );
    }

    result.imagePath = await validateArgumentImagePath(imagePath, 'imagePath');
  }

  // `darkModeImagePath` is present only if `darkMode = true` and then it is a path to valid .png file for dark mode
  if (darkModeImagePath) {
    if (!darkMode) {
      logErrorAndExit(
        `error: As the second argument is recognized as a path to an image file, dark mode is not enabled and no more arguments are expected.`
      );
    }

    result.darkModeImagePath = await validateArgumentImagePath(
      darkModeImagePath,
      'darkModeImagePath'
    );
  }

  // `resizeMode = NATIVE` is selected only with `platform = ANDROID`
  if (resizeMode === ResizeMode.NATIVE && platform !== Platform.ANDROID) {
    logErrorAndExit(`error: Invalid resizeMode '${resizeMode}' for platform '${platform}'.`);
  }

  // `statusBarBackgroundColor` is provided only if `platform = ANDROID`
  if (statusBarBackgroundColor && platform !== Platform.ANDROID) {
    logErrorAndExit(
      `error: Option 'statusbar-background-color' is not available for platform '${platform}'.`
    );
  }

  // `statusBarTranslucent` is provided only if `platform = ANDROID`
  if (statusBarTranslucent && platform !== Platform.ANDROID) {
    logErrorAndExit(
      `error: Option 'statusbar-translucent' is not available for platform '${platform}'.`
    );
  }

  // `darkModeStatusBarStyle` is provided only if `darkMode = true`
  if (darkModeStatusBarStyle && !darkMode) {
    logErrorAndExit(
      `error: Option 'dark-mode-statusbar-style' is not available when dark mode is not enabled.`
    );
  }

  // `darkModeStatusBarBackgroundColor` is provided only if `platform = ANDROID` and `darkMode = true`
  if (darkModeStatusBarBackgroundColor) {
    if (!darkMode) {
      logErrorAndExit(
        `error: Option 'dark-mode-statusbar-background-color' is not available when dark mode is not enabled.`
      );
    }

    if (platform !== Platform.ANDROID) {
      logErrorAndExit(
        `error: Option 'dark-mode-statusbar-background-color' is not available for platform '${platform}'.`
      );
    }
  }

  // `darkModeStatusBarStyle` is provided only if `darkMode = true`
  if (darkModeStatusBarStyle && !darkMode) {
    logErrorAndExit(
      `error: Option 'dark-mode-statusbar-style' is not available when dark mode is not enabled.`
    );
  }

  return result;
}

function generateEnumOptionValidatingFunction(optionName: string, availableOptionsEnum: {}) {
  return (userInput: string) => {
    if (!Object.values<string>(availableOptionsEnum).includes(userInput)) {
      logErrorAndExit(`error: Unknown value '${userInput}' for option '${optionName}'.`);
    }
    return userInput;
  };
}

function generateColorOptionValidatingFunction(optionName: string) {
  return (userInput: string) => {
    const parsedColor = colorString.get(userInput);
    if (!parsedColor) {
      logErrorAndExit(`error: Invalid value '${userInput}' for option '${optionName}'.`);
    }
    return parsedColor;
  };
}

function filterAndConvertOptionsKeys(commenderObject: object): Options {
  return Object.entries(commenderObject)
    .map<[string, any]>(([key, value]) => {
      return [key.replace('statusbar', 'statusBar').replace('Statusbar', 'StatusBar'), value];
    })
    .filter(([key]) => AVAILABLE_OPTIONS_NAMES.has(key))
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, any>) as Options;
}

program
  .arguments(
    '<backgroundColor> [imagePathOrDarkModeBackgroundColor] [imagePath] [darkModeImagePath]'
  )
  .description(
    'Idempotent operation that configures native splash screens using provided backgroundColor and optional .png file. Supports light and dark modes configuration. Dark mode is supported only on iOS 13+ and Android 10+.',
    {
      backgroundColor:
        'Valid css-formatted color (hex (#RRGGBB[AA]), rgb[a], hsl[a], named color (https://drafts.csswg.org/css-color/#named-colors)) that would be used as the background color for native splash screen view.',
      imagePathOrDarkModeBackgroundColor:
        'Path to a valid .png image or valid css-formatted color (see backgroundColor supported formats). When script detects that this argument is a path to a .png file, it assumes dark mode is not supported. Otherwise this argument is treated as a background color for native splash screen in dark mode.',
      imagePath:
        'Path to valid .png image that will be displayed in native splash screen. This argument is available only if dark mode support is detected.',
      darkModeImagePath:
        'Path to valid .png image that will be displayed in native splash screen in dark mode only. If this argument is not specified then image from imagePath will be used in dark mode as well. This argument is available only if dark mode support is detected.',
    }
  )
  .allowUnknownOption(false)
  .option(
    '-r, --resize-mode [resizeMode]',
    `ResizeMode to be used for native splash screen image. Available values: ${getAvailableOptions(
      ResizeMode
    )} (only available for android platform)).`,
    generateEnumOptionValidatingFunction('resize-mode', ResizeMode),
    ResizeMode.CONTAIN
  )
  .option(
    '-p, --platform [platform]',
    `Selected platform to configure. Available values: ${getAvailableOptions(Platform)}.`,
    generateEnumOptionValidatingFunction('platform', Platform),
    Platform.ALL
  )
  .option(
    '--statusbar-style [statusBarStyle]',
    `Customizes the color of the StatusBar icons. Available values: ${getAvailableOptions(
      StatusBarStyle
    )}.`,
    generateEnumOptionValidatingFunction('statusbar-style', StatusBarStyle),
    StatusBarStyle.DEFAULT
  )
  .option(
    '--dark-mode-statusbar-style [darkModeStatusBarStyle]',
    `The very same as 'statusbar-style' option, but applied only in dark mode.`
  )
  .option('--statusbar-hidden', `Hides the StatusBar.`)
  .option(
    '--statusbar-background-color [statusBarBackgroundColor]',
    `(only for Android platform) Customizes the background color of the StatusBar. Valid css-formatted color (see backgroundColor supported formats).`,
    generateColorOptionValidatingFunction('statusbar-background-color')
  )
  .option(
    '--dark-mode-statusbar-background-color [darkModeStatusBarBackgroundColor]',
    `(only for Android platform) The very same as 'statusbar-background-color' option, but applied only in dark mode.`,
    generateColorOptionValidatingFunction('dark-mode-statusbar-background-color')
  )
  .option(
    '--statusbar-translucent',
    `(only for Android platform) Makes the StatusBar translucent (enables drawing under the StatusBar area).`
  )
  .action(
    async (
      backgroundColor: string,
      imagePathOrDarkModeBackgroundColor: string | undefined,
      imagePath: string | undefined,
      darkModeImagePath: string | undefined,
      options: object
    ) => {
      const configuration = {
        backgroundColor,
        imagePathOrDarkModeBackgroundColor,
        imagePath,
        darkModeImagePath,
        ...filterAndConvertOptionsKeys(options),
      };
      const validatedConfiguration = await validateConfiguration(configuration);
      return action(validatedConfiguration);
    }
  );

program.parse(process.argv);
