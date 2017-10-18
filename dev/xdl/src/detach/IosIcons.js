import path from 'path';

import {
  saveImageToPathAsync,
  saveUrlToPathAsync,
  spawnAsyncThrowError,
} from './ExponentTools';

function _getAppleIconQualifier(iconSize, iconResolution) {
  let iconQualifier;
  if (iconResolution !== 1) {
    // e.g. "29x29@3x"
    iconQualifier = `${iconSize}x${iconSize}@${iconResolution}x`;
  } else {
    iconQualifier = `${iconSize}x${iconSize}`;
  }
  if (iconSize === 76 || iconSize === 83.5) {
    // ipad sizes require ~ipad at the end
    iconQualifier = `${iconQualifier}~ipad`;
  }
  return iconQualifier;
}

/**
 * Based on keys in the given manifest,
 * ensure that the proper iOS icon images exist -- assuming Info.plist already
 * points at them under CFBundleIcons.CFBundlePrimaryIcon.CFBundleIconFiles.
 *
 * This only works on MacOS (as far as I know) because it uses the sips utility.
 */
async function createAndWriteIconsToPathAsync(
  manifest,
  destinationIconPath,
  projectRoot
) {
  if (process.platform !== 'darwin') {
    console.warn('`sips` utility may or may not work outside of macOS');
  }
  let defaultIconFilename;
  if (manifest.ios && manifest.ios.iconUrl) {
    defaultIconFilename = 'exp-icon.png';
    await saveUrlToPathAsync(
      manifest.ios.iconUrl,
      `${destinationIconPath}/${defaultIconFilename}`
    );
  } else if (manifest.iconUrl) {
    defaultIconFilename = 'exp-icon.png';
    await saveUrlToPathAsync(
      manifest.iconUrl,
      `${destinationIconPath}/${defaultIconFilename}`
    );
  } else if (projectRoot && manifest.icon) {
    defaultIconFilename = 'exp-icon.png';
    await saveImageToPathAsync(
      projectRoot,
      manifest.icon,
      `${destinationIconPath}/${defaultIconFilename}`
    );
  }

  let iconSizes = [20, 29, 40, 60, 76, 83.5, 1024];
  iconSizes.forEach(iconSize => {
    let iconResolutions;
    if (iconSize === 76) {
      // iPad has 1x and 2x icons for this size only
      iconResolutions = [1, 2];
    } else if (iconSize == 1024) {
      // marketing icon is weird
      iconResolutions = [1];
    } else {
      iconResolutions = [2, 3];
    }
    iconResolutions.forEach(async iconResolution => {
      let iconQualifier = _getAppleIconQualifier(iconSize, iconResolution);
      // TODO(nikki): Support local paths for these icons
      let iconKey = `iconUrl${iconQualifier}`;
      let rawIconFilename;
      let usesDefault = false;
      if (manifest.ios && manifest.ios.hasOwnProperty(iconKey)) {
        // manifest specifies an image just for this size/resolution, use that
        rawIconFilename = `exp-icon${iconQualifier}.png`;
        await saveUrlToPathAsync(
          manifest.ios[iconKey],
          `${destinationIconPath}/${rawIconFilename}`
        );
      } else {
        // use default manifest.iconUrl
        usesDefault = true;
        if (defaultIconFilename) {
          rawIconFilename = defaultIconFilename;
        } else {
          console.warn(
            `Manifest does not specify ios.${iconKey} nor a default iconUrl. Bundle will use the Expo logo.`
          );
          return;
        }
      }

      let iconFilename = `AppIcon${iconQualifier}.png`;
      let iconSizePx = iconSize * iconResolution;
      // rewrite the color profile of the icon to the system profile
      // otherwise sips will barf when resizing for some images per
      // https://stackoverflow.com/questions/40316819/sips-shows-unable-to-render-destination-image
      // this is supposedly related to 16-bit vs. 8-bit color profiles but w/e
      try {
        await spawnAsyncThrowError(
          'sips',
          [
            '--matchTo',
            '/System/Library/ColorSync/Profiles/sRGB Profile.icc',
            '--out',
            iconFilename,
            rawIconFilename,
          ],
          {
            stdio: ['ignore', 'ignore', 'ignore'],
            cwd: destinationIconPath,
          }
        );
      } catch (_) {
        // if sips color profile matching failed, still write the original file to
        // the destination path and try that, since the color thing isn't required
        // for most images.
        await spawnAsyncThrowError('/bin/cp', [rawIconFilename, iconFilename], {
          stdio: 'inherit',
          cwd: destinationIconPath,
        });
      }
      await spawnAsyncThrowError('sips', ['-Z', iconSizePx, iconFilename], {
        stdio: ['ignore', 'ignore', 'inherit'], // only stderr
        cwd: destinationIconPath,
      });

      // reject non-square icons (because Apple will if we don't)
      const dims = await getImageDimensionsMacOSAsync(
        destinationIconPath,
        iconFilename
      );
      if (!dims || dims.length < 2 || dims[0] !== dims[1]) {
        throw new Error(
          `iOS icons must be square, the dimensions of ${iconFilename} are ${dims}`
        );
      }

      if (!usesDefault) {
        // non-default icon used, clean up the downloaded version
        await spawnAsyncThrowError('/bin/rm', [
          path.join(destinationIconPath, rawIconFilename),
        ]);
      }
    });
  });

  // clean up default icon
  if (defaultIconFilename) {
    await spawnAsyncThrowError('/bin/rm', [
      path.join(destinationIconPath, defaultIconFilename),
    ]);
  }
  return;
}

/**
 *  @return array [ width, height ] or nil if that fails for some reason.
 */
async function getImageDimensionsMacOSAsync(dirname, basename) {
  if (process.platform !== 'darwin') {
    console.warn('`sips` utility may or may not work outside of macOS');
  }
  let childProcess = await spawnAsyncThrowError(
    'sips',
    ['-g', 'pixelWidth', '-g', 'pixelHeight', basename],
    {
      cwd: dirname,
    }
  );
  let dimensions;
  try {
    // stdout looks something like 'pixelWidth: 1200\n pixelHeight: 800'
    const components = childProcess.stdout.split(/(\s+)/);
    dimensions = components.map(c => parseInt(c, 10)).filter(n => !isNaN(n));
  } catch (_) {}
  return dimensions;
}

export { createAndWriteIconsToPathAsync, getImageDimensionsMacOSAsync };
