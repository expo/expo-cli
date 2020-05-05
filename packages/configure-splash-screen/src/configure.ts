#!/usr/bin/env node

import program from 'commander';
import colorString, { ColorDescriptor } from 'color-string';
import fs from 'fs-extra';
import path from 'path';

import configureAndroid from './android';
import { ResizeMode, Platform } from './constants';
import configureIos from './ios';

/**
 * These arguments have to be provided by the user or omitted if possible.
 */
interface Arguments {
  backgroundColor: ColorDescriptor;
  imagePath?: string;
}

/**
 * These might be optionally provided by the user. There are default values for them.
 */
interface Options {
  resizeMode: ResizeMode;
  platform: Platform;
}

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
  return Object.values(o).join(' | ');
}

function logErrorAndExit(errorMessage: string): never {
  console.error(errorMessage);
  process.exit(1);
}

/**
 * Ensures following semantic requirements are met:
 * @param configuration.imagePath path that points to a valid .png file
 * @param configuration.resizeMode ResizeMode.NATIVE is selected only with Platform.ANDROID
 * @param configuration.backgroundColor is valid hex #RGB/#RGBA color
 */
async function validateConfiguration(
  configuration: Options & Omit<Arguments, 'backgroundColor'> & { backgroundColor: string }
): never | Promise<Options & Arguments> {
  const { resizeMode, imagePath: imagePathString, platform } = configuration;

  // check for `native` resizeMode being selected only for `android` platform
  if (resizeMode === ResizeMode.NATIVE && platform !== Platform.ANDROID) {
    logErrorAndExit(`error: Invalid resizeMode '${resizeMode}' for platform '${platform}'.`);
  }

  const backgroundColor = colorString.get(configuration.backgroundColor);
  if (!backgroundColor) {
    logErrorAndExit(
      `error: Invalid value '${configuration.backgroundColor}' for argument 'backgroundColor'.`
    );
  }

  if (imagePathString) {
    const imagePath = path.resolve(imagePathString);
    // check if `imagePath` exists
    if (!(await fs.pathExists(imagePath))) {
      logErrorAndExit(
        `error: Invalid path '${imagePathString}' for argument 'imagePath'. File does not exist. Provide path to a valid .png file.`
      );
    }

    // check if `imagePath` is a readable .png file
    if (path.extname(imagePath) !== '.png') {
      logErrorAndExit(
        `error: Invalid path '${imagePathString}' for argument 'imagePath'. File is not a .png file. Provide path to a valid .png file.`
      );
    }
  }

  return {
    ...configuration,
    backgroundColor,
  };
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
  .arguments('<backgroundColor> [imagePath]')
  .description(
    'Idempotent operation that configures native splash screens using passed .png file that would be used in native splash screen.',
    {
      backgroundColor: `Valid css-formatted color (hex (#RRGGBB[AA]), rgb[a], hsl[a], named color (https://drafts.csswg.org/css-color/#named-colors)) that would be used as background color for native splash screen view.`,
      imagePath: `Path to a valid .png image.`,
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
      imagePath: string | undefined,
      { resizeMode, platform }: program.Command & Options
    ) => {
      const configuration = { imagePath, backgroundColor, resizeMode, platform };
      const validatedConfiguration = await validateConfiguration(configuration);
      return action(validatedConfiguration);
    }
  );

program.parse(process.argv);
