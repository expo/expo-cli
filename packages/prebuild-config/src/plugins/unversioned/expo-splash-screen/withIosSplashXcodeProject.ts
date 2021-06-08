import { ConfigPlugin, IOSConfig, withXcodeProject } from '@expo/config-plugins';
import Debug from 'debug';
import fs from 'fs-extra';
import * as path from 'path';
import { XcodeProject } from 'xcode';

import {
  applyImageToSplashScreenXML,
  createTemplateSplashScreenAsync,
  ImageContentMode,
  toString,
} from './InterfaceBuilder';
import { IOSSplashConfig } from './getIosSplashConfig';

const debug = Debug('@expo/prebuild-config:expo-splash-screen:ios:xcodeproj');

const STORYBOARD_FILE_PATH = './SplashScreen.storyboard';

export const withIosSplashXcodeProject: ConfigPlugin<IOSSplashConfig> = (config, splash) => {
  return withXcodeProject(config, async config => {
    const projectPath = IOSConfig.Paths.getSourceRoot(config.modRequest.projectRoot);
    config.modResults = await setSplashStoryboardAsync(
      { projectPath, projectName: config.modRequest.projectName!, project: config.modResults },
      splash
    );
    return config;
  });
};

/**
 * Modifies `.pbxproj` by:
 * - adding reference for `.storyboard` file
 */
function updatePbxProject({
  projectName,
  project,
}: {
  projectName: string;
  project: XcodeProject;
}): void {
  // Check if `${projectName}/SplashScreen.storyboard` already exists
  // Path relative to `ios` directory
  const storyboardFilePath = path.join(projectName, STORYBOARD_FILE_PATH);
  if (!project.hasFile(storyboardFilePath)) {
    debug(`Adding ${storyboardFilePath} to Xcode project`);
    IOSConfig.XcodeUtils.addResourceFileToGroup({
      filepath: storyboardFilePath,
      groupName: projectName,
      project,
    });
  }
}

function getImageContentMode(resizeMode: string): ImageContentMode {
  switch (resizeMode) {
    case 'contain':
      return 'scaleAspectFit';
    case 'cover':
      return 'scaleAspectFill';
    default:
      throw new Error(`{ resizeMode: "${resizeMode}" } is not supported for iOS platform.`);
  }
}

/**
 * Creates [STORYBOARD] file containing ui description of Splash/Launch Screen.
 */
export async function getSplashStoryboardContentsAsync(
  config?: Partial<Pick<IOSSplashConfig, 'image' | 'resizeMode'>>
): Promise<string> {
  const resizeMode = config?.resizeMode;
  const splashScreenImagePresent = Boolean(config?.image);

  let xml = await createTemplateSplashScreenAsync();

  // Only get the resize mode when the image is present.
  if (splashScreenImagePresent) {
    const contentMode = getImageContentMode(resizeMode || 'contain');
    xml = applyImageToSplashScreenXML(xml, {
      contentMode,
      imageName: 'SplashScreen',
    });
  }

  return toString(xml);
}

export async function setSplashStoryboardAsync(
  {
    projectPath,
    projectName,
    project,
  }: { projectPath: string; projectName: string; project: XcodeProject },
  config?: Partial<Pick<IOSSplashConfig, 'image' | 'resizeMode'>>
): Promise<XcodeProject> {
  const contents = await getSplashStoryboardContentsAsync(config);

  const filePath = path.resolve(projectPath, STORYBOARD_FILE_PATH);
  await fs.ensureDir(projectPath);
  await fs.writeFile(filePath, contents);

  await updatePbxProject({ projectName, project });
  return project;
}
