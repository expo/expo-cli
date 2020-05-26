import path from 'path';

import { ResizeMode, Arguments, StatusBarOptions, AndroidOnlyStatusBarOptions } from '../constants';
import configureAndroidManifestXml from './AndroidManifest.xml';
import configureColorsXml from './Colors.xml';
import configureDrawableXml from './Drawable.xml';
import configureDrawables from './Drawables';
import configureMainActivity from './MainActivity';
import configureStylesXml from './Styles.xml';

export default async function configureAndroid(
  projectRootPath: string,
  {
    resizeMode,
    backgroundColor,
    darkModeBackgroundColor,
    imagePath,
    darkModeImagePath,
    statusBarHidden,
    statusBarStyle,
    darkModeStatusBarStyle,
    statusBarTranslucent,
    statusBarBackgroundColor,
    darkModeStatusBarBackgroundColor,
  }: Arguments &
    Partial<StatusBarOptions> &
    Partial<AndroidOnlyStatusBarOptions> & { resizeMode: ResizeMode }
) {
  const androidMainPath = path.resolve(projectRootPath, 'android/app/src/main');

  await Promise.all([
    configureDrawables(androidMainPath, imagePath, darkModeImagePath),
    configureColorsXml(androidMainPath, {
      backgroundColor,
      darkModeBackgroundColor,
      statusBarBackgroundColor,
      darkModeStatusBarBackgroundColor,
    }),
    configureDrawableXml(androidMainPath, resizeMode),
    configureStylesXml(androidMainPath, {
      statusBarHidden,
      statusBarStyle,
      darkModeStatusBarStyle,
      addStatusBarBackgroundColor: !!statusBarBackgroundColor,
    }),
    configureAndroidManifestXml(androidMainPath),
    configureMainActivity(projectRootPath, resizeMode, statusBarTranslucent),
  ]);
}
