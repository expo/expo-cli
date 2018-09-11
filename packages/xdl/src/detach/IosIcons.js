/**
 *  @flow
 */
import path from 'path';

import { saveImageToPathAsync, saveUrlToPathAsync, spawnAsyncThrowError } from './ExponentTools';
import StandaloneContext from './StandaloneContext';
import { getImageDimensionsMacOSAsync, resizeImageAsync } from '../tools/ImageUtils';
import logger from './Logger';

function _getAppleIconQualifier(iconSize: number, iconResolution: number): string {
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

async function _saveDefaultIconToPathAsync(context: StandaloneContext, path: string) {
  if (context.type === 'user') {
    if (context.data.exp.icon) {
      await saveImageToPathAsync(context.data.projectPath, context.data.exp.icon, path);
    } else {
      throw new Error('Cannot save icon because app.json has no exp.icon key.');
    }
  } else {
    if (context.data.manifest.ios && context.data.manifest.ios.iconUrl) {
      await saveUrlToPathAsync(context.data.manifest.ios.iconUrl, path);
    } else if (context.data.manifest.iconUrl) {
      await saveUrlToPathAsync(context.data.manifest.iconUrl, path);
    } else {
      throw new Error('Cannot save icon because manifest has no iconUrl or ios.iconUrl key.');
    }
  }
}

/**
 * Based on keys in the given context.config,
 * ensure that the proper iOS icon images exist -- assuming Info.plist already
 * points at them under CFBundleIcons.CFBundlePrimaryIcon.CFBundleIconFiles.
 *
 * This only works on MacOS (as far as I know) because it uses the sips utility.
 */
async function createAndWriteIconsToPathAsync(
  context: StandaloneContext,
  destinationIconPath: string
) {
  let defaultIconFilename = 'exp-icon.png';
  try {
    await _saveDefaultIconToPathAsync(context, path.join(destinationIconPath, defaultIconFilename));
  } catch (e) {
    defaultIconFilename = null;
    logger.warn(e.message);
  }

  const iconSizes = [1024, 20, 29, 40, 60, 76, 83.5];

  await Promise.all(
    iconSizes.map(async iconSize => {
      let iconResolutions;
      if (iconSize === 76) {
        // iPad has 1x and 2x icons for this size only
        iconResolutions = [1, 2];
      } else if (iconSize == 1024) {
        // marketing icon is weird
        iconResolutions = [1];
      } else if (iconSize === 83.5) {
        iconResolutions = [2];
      } else {
        iconResolutions = [2, 3];
      }

      // We need to wait for all of these to finish!
      await Promise.all(
        iconResolutions.map(async iconResolution => {
          let iconQualifier = _getAppleIconQualifier(iconSize, iconResolution);
          let iconKey = `iconUrl${iconQualifier}`;
          let rawIconFilename;
          let usesDefault = false;
          if (context.type === 'service') {
            // TODO(nikki): Support local paths for these icons
            const manifest = context.data.manifest;
            if (manifest.ios && manifest.ios.hasOwnProperty(iconKey)) {
              // manifest specifies an image just for this size/resolution, use that
              rawIconFilename = `exp-icon${iconQualifier}.png`;
              await saveUrlToPathAsync(
                manifest.ios[iconKey],
                `${destinationIconPath}/${rawIconFilename}`
              );
            }
          }
          if (!rawIconFilename) {
            // use default iconUrl
            usesDefault = true;
            if (defaultIconFilename) {
              rawIconFilename = defaultIconFilename;
            } else {
              logger.warn(
                `Project does not specify ios.${iconKey} nor a default iconUrl. Bundle will use the Expo logo.`
              );
              return;
            }
          }

          let iconFilename = `AppIcon${iconQualifier}.png`;
          let iconSizePx = iconSize * iconResolution;
          await spawnAsyncThrowError('/bin/cp', [rawIconFilename, iconFilename], {
            stdio: 'inherit',
            cwd: destinationIconPath,
          });
          try {
            await resizeImageAsync(iconSizePx, iconFilename, destinationIconPath);
          } catch (e) {
            throw new Error(`Failed to resize image: ${iconFilename}. (${e})`);
          }

          // reject non-square icons (because Apple will if we don't)
          const dims = await getImageDimensionsMacOSAsync(destinationIconPath, iconFilename);
          if (!dims || dims.length < 2 || dims[0] !== dims[1]) {
            if (!dims) {
              throw new Error(`Unable to read the dimensions of ${iconFilename}`);
            } else {
              throw new Error(
                `iOS icons must be square, the dimensions of ${iconFilename} are ${dims}`
              );
            }
          }

          if (!usesDefault) {
            // non-default icon used, clean up the downloaded version
            await spawnAsyncThrowError('/bin/rm', [
              path.join(destinationIconPath, rawIconFilename),
            ]);
          }
        })
      );
    })
  );

  // clean up default icon
  if (defaultIconFilename) {
    await spawnAsyncThrowError('/bin/rm', [path.join(destinationIconPath, defaultIconFilename)]);
  }
}

export { createAndWriteIconsToPathAsync };
