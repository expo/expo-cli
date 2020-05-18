#!/usr/bin/env node

import program from 'commander';
import colorString from 'color-string';
import fs from 'fs-extra';
import path from 'path';

import configureAndroid from './android';
import { ResizeMode, Platform, Parameters } from './constants';
import configureIos from './ios';

/**
 * These might be optionally provided by the user. There are default values for them.
 */
interface Options {
  resizeMode: ResizeMode;
  platform: Platform;
}

async function action(configuration: Parameters & Options) {
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
  return Object.values(o).join(' | ');
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
async function validateImagePath(imagePath: string, parameterName: string): Promise<string> {
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
 * - `resizeMode = ResizeMode.NATIVE` is selected only with `platform = Platform.ANDROID`
 * - `backgroundColor` is valid css-formatted color
 * - `imagePathOrDarkModeBackgroundColor` is a path to a valid .png file (and then this script assumes no dark mode) or a valid css-formatted color for dark mode (and then this script assumes dark mode is supported)
 * - `imagePath` is present only if darkMode is enabled and then it is a path to valid .png file
 * - `darkModeImagePath` is present only if darkMode is enabled and then it is a path to valid .png file for dark mode
 */
async function validateConfiguration(
  configuration: Options & {
    backgroundColor: string;
    imagePathOrDarkModeBackgroundColor?: string;
    imagePath?: string;
    darkModeImagePath?: string;
  }
): Promise<Options & Parameters> {
  const {
    resizeMode,
    platform,
    backgroundColor,
    imagePathOrDarkModeBackgroundColor,
    imagePath,
    darkModeImagePath,
  } = configuration;

  // check for `native` resizeMode being selected only for `android` platform
  if (resizeMode === ResizeMode.NATIVE && platform !== Platform.ANDROID) {
    logErrorAndExit(`error: Invalid resizeMode '${resizeMode}' for platform '${platform}'.`);
  }

  const parsedBackgroundColor = colorString.get(backgroundColor);
  if (!parsedBackgroundColor) {
    logErrorAndExit(`error: Invalid value '${backgroundColor}' for argument 'backgroundColor'.`);
  }

  // only backgroundColor is provided
  if (!imagePathOrDarkModeBackgroundColor) {
    return {
      resizeMode,
      platform,
      backgroundColor: parsedBackgroundColor,
    };
  }

  const parsedDarkModeBackgroundColor = colorString.get(imagePathOrDarkModeBackgroundColor);
  if (!parsedDarkModeBackgroundColor) {
    // imagePathOrDarkModeBackgroundColor should be a path to an image file
    const resolvedImagePath = await validateImagePath(
      imagePathOrDarkModeBackgroundColor,
      'imagePathOrDarkModeBackgroundColor'
    );

    // check if there're no other arguments passed at this point
    if (imagePath) {
      logErrorAndExit(
        `error: As the second argument is recognized as a path to an image file, dark mode is not not supported.`
      );
    }

    return {
      resizeMode,
      platform,
      backgroundColor: parsedBackgroundColor,
      imagePath: resolvedImagePath,
    };
  }

  if (!imagePath) {
    return {
      resizeMode,
      platform,
      backgroundColor: parsedBackgroundColor,
      darkModeBackgroundColor: parsedDarkModeBackgroundColor,
    };
  }

  const resolvedImagePath = await validateImagePath(imagePath, 'imagePath');
  const result = {
    resizeMode,
    platform,
    backgroundColor: parsedBackgroundColor,
    darkModeBackgroundColor: parsedDarkModeBackgroundColor,
    imagePath: resolvedImagePath,
  };

  if (darkModeImagePath) {
    const resolvedDarkModeImagePath = await validateImagePath(
      darkModeImagePath,
      'darkModeImagePath'
    );
    return {
      ...result,
      darkModeImagePath: resolvedDarkModeImagePath,
    };
  }

  return result;
}

function validateResizeMode(userInput: string) {
  if (!Object.values<string>(ResizeMode).includes(userInput)) {
    logErrorAndExit(`error: Unknown value '${userInput}' for option 'resizeMode'.`);
  }
  return userInput;
}

function validatePlatform(userInput: string) {
  if (!Object.values<string>(Platform).includes(userInput)) {
    logErrorAndExit(`error: Unknown value '${userInput}' for option 'platform'.`);
  }
  return userInput;
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
        'Path to a valid .png image or valid css-formatted color (see lightBackgroundColor supported formats). When script detects that this argument is a path to a .png file, it assumes dark mode is not supported. Otherwise this argument is treated as a background color for native splash screen in dark mode.',
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
    validateResizeMode,
    ResizeMode.CONTAIN
  )
  .option(
    '-p, --platform [platform]',
    `Selected platform to configure. Available values: ${getAvailableOptions(Platform)}.`,
    validatePlatform,
    Platform.ALL
  )
  .action(
    async (
      backgroundColor: string,
      imagePathOrDarkModeBackgroundColor: string | undefined,
      imagePath: string | undefined,
      darkModeImagePath: string | undefined,
      { resizeMode, platform }: program.Command & Options
    ) => {
      const configuration = {
        backgroundColor,
        imagePathOrDarkModeBackgroundColor,
        imagePath,
        darkModeImagePath,
        resizeMode,
        platform,
      };
      const validatedConfiguration = await validateConfiguration(configuration);
      return action(validatedConfiguration);
    }
  );

program.parse(process.argv);
