/**
 * @flow
 */

import probeImageSize from 'probe-image-size';
import path from 'path';
import fs from 'fs';

import { spawnAsyncThrowError } from '../detach/ExponentTools';
import logger from '../detach/Logger';

type NullableDimensionsPromise = Promise<null> | Promise<{ width: number, height: number }>;

/**
 * @param {string} projectBasedir
 * @param {string} relativeFilenamePath
 * @returns {} { width: number, height: number } image dimensions or null
 */
async function getImageDimensionsAsync(
  projectBasedir: string,
  relativeFilenamePath: string
): NullableDimensionsPromise {
  return _getImageDimensionsAsync(projectBasedir, relativeFilenamePath);
}

async function _getImageDimensionsWithImageProbeAsync(
  projectBasedir: string,
  relativePathFromManifest: string
): Promise<{ width: number, height: number }> {
  const imagePath = path.resolve(projectBasedir, relativePathFromManifest);
  const readStream = fs.createReadStream(imagePath);
  const { width, height } = await probeImageSize(readStream);
  readStream.destroy();
  return { width, height };
}

let _hasWarned = false;
async function resizeImageAsync(
  iconSizePx: number,
  iconFilename: string,
  destinationIconPath: string
) {
  if (
    process.platform !== 'darwin' &&
    _resizeImageAsync === _resizeImageWithSipsAsync &&
    !_hasWarned
  ) {
    logger.warn('`sips` utility may or may not work outside of macOS');
    _hasWarned = true;
  }
  return _resizeImageAsync(iconSizePx, iconFilename, destinationIconPath);
}

async function _resizeImageWithSipsAsync(
  iconSizePx: number,
  iconFilename: string,
  destinationIconPath: string
) {
  return spawnAsyncThrowError('sips', ['-Z', iconSizePx, iconFilename], {
    stdio: ['ignore', 'ignore', 'inherit'], // only stderr
    cwd: destinationIconPath,
  });
}

/**
 * Legacy function using `sip` command available on MacOD
 * We're using `probe-imgae-size` nodeJS package
 */
async function _getImageDimensionsWithSipsAsync(
  basename: string,
  dirname: string
): Promise<Array<number>> {
  if (process.platform !== 'darwin') {
    logger.warn('`sips` utility may or may not work outside of macOS');
  }
  let childProcess = await spawnAsyncThrowError(
    'sips',
    ['-g', 'pixelWidth', '-g', 'pixelHeight', basename],
    {
      cwd: dirname,
    }
  );
  // stdout looks something like 'pixelWidth: 1200\n pixelHeight: 800'
  const components = childProcess.stdout.split(/(\s+)/);
  const dimensions = components.map(c => parseInt(c, 10)).filter(n => !isNaN(n));
  if (dimensions.length !== 2) {
    return null;
  }
  return {
    width: dimensions[0],
    height: dimensions[1],
  };
}

// Allow us to swap out the default implementations of image functions
let _resizeImageAsync = _resizeImageWithSipsAsync;
let _getImageDimensionsAsync = _getImageDimensionsWithImageProbeAsync;

// Allow users to provide an alternate implementation for our image resize function.
// This is used internally in order to use sharp instead of sips in standalone builder.
function setResizeImageFunction(
  fn: (iconSizePx: number, iconFilename: string, destinationIconPath: string) => Promise<any>
) {
  _resizeImageAsync = fn;
}

// Allow users to provide an alternate implementation for our image dimensions function.
// This is used internally in order to use sharp instead of sips in standalone builder.
function setGetImageDimensionsFunction(
  fn: (basename: string, dirname: string) => Promise<?Array<number>>
) {
  _getImageDimensionsAsync = fn;
}

export {
  resizeImageAsync,
  setResizeImageFunction,
  setGetImageDimensionsFunction,
  getImageDimensionsAsync,
};
