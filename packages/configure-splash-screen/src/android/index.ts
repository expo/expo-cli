import path from 'path';

import configureAndroidManifestXml from './AndroidManifest.xml';
import configureColorsXml from './Colors.xml';
import configureDrawableXml from './Drawable.xml';
import configureDrawables from './Drawables';
import configureMainActivity from './MainActivity';
import configureStylesXml from './Styles.xml';
import { validateAndroidConfig } from '../validators';
import { AndroidSplashScreenJsonConfig } from '../types';

export default async function configureAndroid(
  projectRootPath: string,
  configJSON: AndroidSplashScreenJsonConfig
) {
  const validatedConfig = await validateAndroidConfig(configJSON);

  const androidMainPath = path.resolve(projectRootPath, 'android/app/src/main');

  await Promise.all([
    configureDrawables(androidMainPath, validatedConfig),
    configureColorsXml(androidMainPath, validatedConfig),
    configureDrawableXml(androidMainPath, validatedConfig),
    configureStylesXml(androidMainPath, validatedConfig),
    configureAndroidManifestXml(androidMainPath),
    configureMainActivity(projectRootPath, validatedConfig),
  ]);
}
