/**
 * @flow
 */

import { spawnAsyncThrowError } from '../detach/ExponentTools';
import logger from '../detach/Logger';

/**
 *  @return array [ width, height ] or null if that fails for some reason.
 */
async function getImageDimensionsMacOSAsync(
  dirname: string,
  basename: string
): Promise<?Array<number>> {
  if (process.platform !== 'darwin') {
    logger.warn('`sips` utility may or may not work outside of macOS');
  }
  let dimensions = null;
  try {
    dimensions = await _getImageDimensionsAsync(basename, dirname);
  } catch (_) {}
  return dimensions;
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

async function _getImageDimensionsWithSipsAsync(
  basename: string,
  dirname: string
): Promise<Array<number>> {
  let childProcess = await spawnAsyncThrowError(
    'sips',
    ['-g', 'pixelWidth', '-g', 'pixelHeight', basename],
    {
      cwd: dirname,
    }
  );
  // stdout looks something like 'pixelWidth: 1200\n pixelHeight: 800'
  const components = childProcess.stdout.split(/(\s+)/);
  return components.map(c => parseInt(c, 10)).filter(n => !isNaN(n));
}

// Allow us to swap out the default implementations of image functions
let _resizeImageAsync = _resizeImageWithSipsAsync;
let _getImageDimensionsAsync = _getImageDimensionsWithSipsAsync;

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
  getImageDimensionsMacOSAsync,
  resizeImageAsync,
  setResizeImageFunction,
  setGetImageDimensionsFunction,
};
