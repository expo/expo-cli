import path from 'path';

import { AndroidSplashScreenConfigJSON } from '../SplashScreenConfig';
import { validateAndroidConfig } from '../validators';
import configureAndroidManifestXml from './AndroidManifest.xml';
import configureColorsXml from './Colors.xml';
import configureDrawableXml from './Drawable.xml';
import configureDrawables from './Drawables';
import configureStringsXml from './Strings.xml';
import configureStylesXml from './Styles.xml';

export default async function configureAndroid(
  projectRootPath: string,
  configJSON: AndroidSplashScreenConfigJSON
) {
  const validatedConfig = await validateAndroidConfig(configJSON);

  const androidMainPath = path.resolve(projectRootPath, 'android/app/src/main');

  await Promise.all([
    configureDrawables(androidMainPath, validatedConfig),
    configureColorsXml(androidMainPath, validatedConfig),
    configureDrawableXml(androidMainPath, validatedConfig),
    configureStylesXml(androidMainPath, validatedConfig),
    configureAndroidManifestXml(androidMainPath),
    configureStringsXml(androidMainPath, validatedConfig),
  ]);
}
