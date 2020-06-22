import fs from 'fs-extra';

import { IosSplashScreenJsonConfig } from '../types';
import { validateIosConfig } from '../validators';
import configureBackgroundAsset from './BackgroundAsset';
import configureImageAsset from './ImageAsset';
import configureInfoPlist from './Info.plist';
import configureStoryboard from './Storyboard';
import readPbxProject from './pbxproj';

export default async function configureIos(
  projectRootPath: string,
  config: IosSplashScreenJsonConfig
) {
  const validatedConfig = await validateIosConfig(config);

  const iosProject = await readPbxProject(projectRootPath);

  await Promise.all([
    configureInfoPlist(iosProject.projectPath, validatedConfig),
    configureImageAsset(iosProject.projectPath, validatedConfig),
    configureBackgroundAsset(iosProject.projectPath, validatedConfig),
    configureStoryboard(iosProject, validatedConfig),
  ]);

  await fs.writeFile(iosProject.pbxProject.filepath, iosProject.pbxProject.writeSync());
}
