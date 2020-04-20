import semver from 'semver';
import spawnAsync from '@expo/spawn-async';
import resolveFrom from 'resolve-from';
import { Options, SharpCommandOptions, SharpGlobalOptions } from './sharp.types';

const SHARP_HELP_PATTERN = /\n\nSpecify --help for available options/g;
const SHARP_REQUIRED_VERSION = '^1.10.0';

export async function resizeBufferAsync(buffer: Buffer, sizes: number[]): Promise<Buffer[]> {
  const sharp = await findSharpInstanceAsync();

  const metadata = await sharp(buffer).metadata();
  // Create buffer for each size
  const resizedBuffers = await Promise.all(
    sizes.map(dimension => {
      const density = (dimension / Math.max(metadata.width, metadata.height)) * metadata.density;
      return sharp(buffer, {
        density: isNaN(density) ? undefined : Math.ceil(density),
      })
        .resize(dimension, dimension, { fit: 'contain', background: 'transparent' })
        .toBuffer();
    })
  );

  return resizedBuffers;
}

export async function isAvailableAsync(): Promise<boolean> {
  try {
    return !!(await findSharpBinAsync());
  } catch (_) {
    return false;
  }
}

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
        '\nProcessing images using sharp-cli failed: ' +
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
let _sharpInstance: any | null = null;

async function findSharpBinAsync(): Promise<string> {
  if (_sharpBin) {
    return _sharpBin;
  }
  try {
    const sharpCliPackage = require('sharp-cli/package.json');
    const libVipsVersion = require('sharp').versions.vips;
    if (
      sharpCliPackage &&
      semver.satisfies(sharpCliPackage.version, SHARP_REQUIRED_VERSION) &&
      typeof sharpCliPackage.bin.sharp === 'string' &&
      typeof libVipsVersion === 'string'
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
    throw notFoundError(SHARP_REQUIRED_VERSION);
  }

  if (!semver.satisfies(installedCliVersion, SHARP_REQUIRED_VERSION)) {
    showVersionMismatchWarning(SHARP_REQUIRED_VERSION, installedCliVersion);
  }
  _sharpBin = 'sharp';
  return _sharpBin;
}

export async function findSharpInstanceAsync(): Promise<any | null> {
  if (_sharpInstance) {
    return _sharpInstance;
  }
  // Ensure sharp-cli version is correct
  await findSharpBinAsync();

  // Attempt to use local sharp package
  try {
    const sharp = require('sharp');
    _sharpInstance = sharp;
    return sharp;
  } catch (_) {}

  // Attempt to resolve the sharp instance used by the global CLI
  let sharpCliPath;
  try {
    sharpCliPath = (await spawnAsync('which', ['sharp'])).stdout.toString().trim();
  } catch (e) {
    throw new Error(`Failed to find the instance of sharp used by the global sharp-cli package.`);
  }

  // resolve sharp from the sharp-cli package
  const sharpPath = resolveFrom.silent(sharpCliPath, 'sharp');

  if (sharpPath) {
    try {
      // attempt to require the global sharp package
      _sharpInstance = require(sharpPath);
    } catch (_) {}
  }

  return _sharpInstance;
}

function notFoundError(requiredCliVersion: string): Error {
  return new Error(
    `This command requires version ${requiredCliVersion} of \`sharp-cli\`. \n` +
      `You can install it using \`npm install -g sharp-cli@${requiredCliVersion}\`. \n` +
      '\n' +
      'For prerequisites, see: https://sharp.dimens.io/en/stable/install/#prerequisites'
  );
}

let versionMismatchWarningShown = false;

function showVersionMismatchWarning(requiredCliVersion: string, installedCliVersion: string) {
  if (versionMismatchWarningShown) {
    return;
  }
  console.warn(
    `Warning: This command requires version ${requiredCliVersion} of \`sharp-cli\`. \n` +
      `Currently installed version: "${installedCliVersion}" \n` +
      `Required version: "${requiredCliVersion}" \n` +
      `You can install it using \`npm install -g sharp-cli@${requiredCliVersion}\`. \n` +
      '\n' +
      'For prerequisites, see: https://sharp.dimens.io/en/stable/install/#prerequisites'
  );
  versionMismatchWarningShown = true;
}
