import { getConfig } from '@expo/config';
import chalk from 'chalk';
import { Versions } from 'xdl';

import Log from '../../log';
import { getImageDimensionsAsync } from './getImageDimensionsAsync';

type DPIConstraint = {
  dpi: 'mdpi' | 'hdpi' | 'xhdpi' | 'xxhdpi' | 'xxxhdpi';
  sizeMultiplier: number;
};

const splashScreenDPIConstraints: readonly DPIConstraint[] = [
  {
    dpi: 'mdpi',
    sizeMultiplier: 1,
  },
  {
    dpi: 'hdpi',
    sizeMultiplier: 1.5,
  },
  {
    dpi: 'xhdpi',
    sizeMultiplier: 2,
  },
  {
    dpi: 'xxhdpi',
    sizeMultiplier: 3,
  },
  {
    dpi: 'xxxhdpi',
    sizeMultiplier: 4,
  },
];

/**
 * Checks whether `resizeMode` is set to `native` and if `true` analyzes provided images for splashscreen
 * providing `Logger` feedback upon problems.
 * @param projectRoot - directory of the expo project
 * @since SDK33
 */
export async function checkSplashScreenImages(projectRoot: string): Promise<void> {
  const { exp } = getConfig(projectRoot);

  // return before SDK33
  if (!Versions.gteSdkVersion(exp, '33.0.0')) {
    return;
  }

  const splashScreenMode = exp.android?.splash?.resizeMode ?? exp.splash?.resizeMode ?? 'contain';

  // only mode `native` is handled by this check
  if (splashScreenMode === 'contain' || splashScreenMode === 'cover') {
    return;
  }

  const generalSplashImagePath = exp.splash?.image;
  if (!generalSplashImagePath) {
    Log.warn(
      `Couldn't read '${chalk.italic('splash.image')}' from ${chalk.italic(
        'app.json'
      )}. Provide asset that would serve as baseline splash image.`
    );
    return;
  }
  const generalSplashImage = await getImageDimensionsAsync(projectRoot, generalSplashImagePath);
  if (!generalSplashImage) {
    Log.warn(
      `Couldn't read dimensions of provided splash image '${chalk.italic(
        generalSplashImagePath
      )}'. Does the file exist?`
    );
    return;
  }

  const androidSplash = exp.android?.splash;
  const androidSplashImages = [];
  for (const { dpi, sizeMultiplier } of splashScreenDPIConstraints) {
    const imageRelativePath = androidSplash?.[dpi];
    if (imageRelativePath) {
      const splashImage = await getImageDimensionsAsync(projectRoot, imageRelativePath);
      if (!splashImage) {
        Log.warn(
          `Couldn't read dimensions of provided splash image '${chalk.italic(
            imageRelativePath
          )}'. Does the file exist?`
        );
        continue;
      }
      const { width, height } = splashImage;
      const expectedWidth = sizeMultiplier * generalSplashImage.width;
      const expectedHeight = sizeMultiplier * generalSplashImage.height;
      androidSplashImages.push({
        dpi,
        width,
        height,
        expectedWidth,
        expectedHeight,
        sizeMatches: width === expectedWidth && height === expectedHeight,
      });
    }
  }

  if (androidSplashImages.length === 0) {
    Log.warn(`Splash resizeMode is set to 'native', but you haven't provided any images for different DPIs.
  Be aware that your splash image will be used as xxxhdpi asset and its ${chalk.bold(
    'actual size will be different'
  )} depending on device's DPI.
  See https://docs.expo.io/guides/splash-screens/#splash-screen-api-limitations-on-android for more information`);
    return;
  }

  if (androidSplashImages.some(({ sizeMatches }) => !sizeMatches)) {
    Log.warn(`Splash resizeMode is set to 'native' and you've provided different images for different DPIs,
  but their sizes mismatch expected ones: [dpi: provided (expected)] ${androidSplashImages
    .map(
      ({ dpi, width, height, expectedWidth, expectedHeight }) =>
        `${dpi}: ${width}x${height} (${expectedWidth}x${expectedHeight})`
    )
    .join(', ')}
  See https://docs.expo.io/guides/splash-screens/#splash-screen-api-limitations-on-android for more information`);
  }
}
