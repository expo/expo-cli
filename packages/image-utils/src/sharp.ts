import semver from 'semver';
import spawnAsync from '@expo/spawn-async';

import { optionalDependencies } from '../package.json';

export type SharpGlobalOptions = {
  compressionLevel?: '';
  format?: 'input' | 'jpeg' | 'jpg' | 'png' | 'raw' | 'tiff' | 'webp';
  input: string;
  limitInputPixels?: number;
  output: string;
  progressive?: boolean;
  quality?: number;
  withMetadata?: boolean;
  [key: string]: string | number | boolean | undefined | null;
};

export type SharpCommandOptions = RemoveAlphaOptions | ResizeOptions;

type RemoveAlphaOptions = {
  operation: 'removeAlpha';
};

type ResizeOptions = {
  operation: 'resize';
  background?: string;
  fastShrinkOnLoad?: boolean;
  fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
  height?: number;
  kernel?: 'nearest' | 'cubic' | 'mitchell' | 'lanczos2' | 'lanczos3';
  position?:
    | 'center'
    | 'centre'
    | 'north'
    | 'east'
    | 'south'
    | 'west'
    | 'northeast'
    | 'southeast'
    | 'southwest'
    | 'northwest'
    | 'top'
    | 'right'
    | 'bottom'
    | 'left'
    | 'right top'
    | 'right bottom'
    | 'left bottom'
    | 'left top'
    | 'entropy'
    | 'attention';
  width: number;
  withoutEnlargement?: boolean;
};

type Options =
  | {}
  | {
      [key: string]: boolean | number | string | undefined;
    };

const requiredCliVersion = optionalDependencies['sharp-cli'];

const SHARP_HELP_PATTERN = /\n\nSpecify --help for available options/g;

export async function sharpAsync(
  options: SharpGlobalOptions,
  commands: SharpCommandOptions[] = []
): Promise<string[]> {
  const bin = await findSharpBinAsync();
  try {
    const { stdout } = await spawnAsync(bin, [
      ...getOptions(options),
      ...getCommandOptions(commands),
    ]);
    const outputFilePaths = stdout.trim().split('\n');
    return outputFilePaths;
  } catch (error) {
    if (error.stderr) {
      throw new Error(
        +'\nProcessing images using sharp-cli failed: ' +
          error.message +
          '\nOutput: ' +
          error.stderr.replace(SHARP_HELP_PATTERN, '')
      );
    } else {
      throw error;
    }
  }
}

function getOptions(options: Options): string[] {
  const args = [];
  for (const [key, value] of Object.entries(options)) {
    if (value != null && value !== false) {
      if (typeof value === 'boolean') {
        args.push(`--${key}`);
      } else if (typeof value === 'number') {
        args.push(`--${key}`, value.toFixed());
      } else {
        args.push(`--${key}`, value);
      }
    }
  }
  return args;
}

function getCommandOptions(commands: SharpCommandOptions[]): string[] {
  const args: string[] = [];
  for (const command of commands) {
    if (command.operation === 'resize') {
      const { operation, width, ...namedOptions } = command;
      args.push(operation, width.toFixed(), ...getOptions(namedOptions));
    } else {
      const { operation, ...namedOptions } = command;
      args.push(operation, ...getOptions(namedOptions));
    }
    args.push('--');
  }
  return args;
}

let _sharpBin: string | null = null;

async function findSharpBinAsync(): Promise<string> {
  if (_sharpBin) {
    return _sharpBin;
  }
  try {
    const sharpCliPackage = require('sharp-cli/package.json');
    if (
      sharpCliPackage &&
      semver.satisfies(sharpCliPackage.version, requiredCliVersion) &&
      typeof sharpCliPackage.bin.sharp === 'string'
    ) {
      _sharpBin = require.resolve(`sharp-cli/${sharpCliPackage.bin.sharp}`);
      return _sharpBin;
    }
  } catch (e) {
    // fall back to global sharp-cli
  }

  let installedCliVersion;
  try {
    installedCliVersion = (await spawnAsync('sharp', ['--version'])).stdout.toString().trim();
  } catch (e) {
    throw notFoundError();
  }

  if (semver.satisfies(installedCliVersion, requiredCliVersion)) {
    _sharpBin = 'sharp';
    return _sharpBin;
  } else {
    throw versionMismatchError(installedCliVersion);
  }
}

function notFoundError(): Error {
  return new Error(
    `This command requires version ${requiredCliVersion} of \`sharp-cli\`. \n` +
      `You can install it using \`npm install -g sharp-cli@${requiredCliVersion}\`. \n` +
      '\n' +
      'For prerequisites, see: https://sharp.dimens.io/en/stable/install/#prerequisites'
  );
}

function versionMismatchError(installedCliVersion: string): Error {
  return new Error(
    `This command requires version ${requiredCliVersion} of \`sharp-cli\`. \n` +
      `Currently installed version: "${installedCliVersion}" \n` +
      `Required version: "${requiredCliVersion}" \n` +
      `You can install it using \`npm install -g sharp-cli@${requiredCliVersion}\`. \n` +
      '\n' +
      'For prerequisites, see: https://sharp.dimens.io/en/stable/install/#prerequisites'
  );
}
