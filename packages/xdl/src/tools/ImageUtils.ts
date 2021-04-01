import fs from 'fs';
import path from 'path';
import probeImageSize from 'probe-image-size';

import { ExponentTools, LoggerDetach } from '../internal';

/**
 * @param {string} projectDirname
 * @param {string} basename
 * @returns {} { width: number, height: number } image dimensions or null
 */
async function getImageDimensionsAsync(
  projectDirname: string,
  basename: string
): Promise<{ width: number; height: number } | null> {
  try {
    return await _getImageDimensionsAsync(projectDirname, basename);
  } catch {}
  return null;
}

async function _getImageDimensionsWithImageProbeAsync(
  projectDirname: string,
  basename: string
): Promise<{ width: number; height: number }> {
  const imagePath = path.resolve(projectDirname, basename);
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
    LoggerDetach.warn('`sips` utility may or may not work outside of macOS');
    _hasWarned = true;
  }
  return _resizeImageAsync(iconSizePx, iconFilename, destinationIconPath);
}

async function _resizeImageWithSipsAsync(
  iconSizePx: number,
  iconFilename: string,
  destinationIconPath: string
) {
  return ExponentTools.spawnAsyncThrowError('sips', ['-Z', iconSizePx.toFixed(), iconFilename], {
    stdio: ['ignore', 'ignore', 'inherit'], // only stderr
    cwd: destinationIconPath,
  });
}

// Allow us to swap out the default implementations of image functions
let _resizeImageAsync = _resizeImageWithSipsAsync;
let _getImageDimensionsAsync: (
  dirname: string,
  filename: string
) => Promise<{ width: number; height: number } | null> = _getImageDimensionsWithImageProbeAsync;

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
  fn: (dirname: string, filename: string) => Promise<{ width: number; height: number } | null>
) {
  _getImageDimensionsAsync = fn;
}

export {
  resizeImageAsync,
  setResizeImageFunction,
  setGetImageDimensionsFunction,
  getImageDimensionsAsync,
};
