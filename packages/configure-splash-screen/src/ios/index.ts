import fs from 'fs-extra';

import { ResizeMode, Arguments, StatusBarOptions } from '../constants';
import configureBackgroundAsset from './BackgroundAsset';
import configureImageAsset from './ImageAsset';
import configureInfoPlist from './Info.plist';
import configureStoryboard from './Storyboard';
import readPbxProject from './pbxproj';
import configureAppDelegate from './AppDelegate';

export default async function configureIos(
  projectRootPath: string,
  {
    resizeMode,
    backgroundColor,
    darkModeBackgroundColor,
    imagePath,
    darkModeImagePath,
    statusBarHidden,
    statusBarStyle,
  }: Arguments & Partial<StatusBarOptions> & { resizeMode: ResizeMode }
) {
  const iosProject = await readPbxProject(projectRootPath);

  await Promise.all([
    configureInfoPlist(iosProject.projectPath, { statusBarHidden, statusBarStyle }),
    configureImageAsset(iosProject.projectPath, imagePath, darkModeImagePath),
    configureBackgroundAsset(iosProject.projectPath, backgroundColor, darkModeBackgroundColor),
    configureStoryboard(iosProject, {
      resizeMode,
      splashScreenImagePresent: !!imagePath,
    }),
    configureAppDelegate(iosProject),
  ]);

  await fs.writeFile(iosProject.pbxProject.filepath, iosProject.pbxProject.writeSync());
}
