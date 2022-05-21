import { ConfigPlugin, IOSConfig, withXcodeProject } from '@expo/config-plugins';
import Debug from 'debug';
import * as path from 'path';
import { XcodeProject } from 'xcode';

import {
  applyImageToSplashScreenXML,
  createTemplateSplashScreenAsync,
  ImageContentMode,
  toString,
} from './InterfaceBuilder';
import { IOSSplashConfig } from './getIosSplashConfig';
import {
  STORYBOARD_FILE_PATH,
  withIosSplashScreenStoryboard,
} from './withIosSplashScreenStoryboard';

const debug = Debug('expo:prebuild-config:expo-splash-screen:ios:xcodeproj');

export const withIosSplashScreenImage: ConfigPlugin<IOSSplashConfig> = (config, splash) => {
  // const labelXml = await new Parser().parseStringPromise(
  //   `<label opaque="NO" userInteractionEnabled="NO" contentMode="left" horizontalHuggingPriority="251" verticalHuggingPriority="251" text="Evan Bacon" textAlignment="center" lineBreakMode="tailTruncation" baselineAdjustment="alignBaselines" adjustsFontSizeToFit="NO" translatesAutoresizingMaskIntoConstraints="NO" id="Xy0-Cd-FXu">
  //    <rect key="frame" x="20" y="682" width="374" height="34"/>
  //    <fontDescription key="fontDescription" type="system" pointSize="28"/>
  //    <nil key="textColor"/>
  //    <nil key="highlightedColor"/>
  //  </label>`);
  return withIosSplashScreenStoryboard(config, async config => {
    const resizeMode = splash?.resizeMode;
    const splashScreenImagePresent = Boolean(splash?.image);
    // Only get the resize mode when the image is present.
    if (splashScreenImagePresent) {
      const contentMode = getImageContentMode(resizeMode || 'contain');
      config.modResults = applyImageToSplashScreenXML(config.modResults, {
        contentMode,
        imageName: 'SplashScreen',
      });
    }
    return config;
  });
};

export const withIosSplashXcodeProject: ConfigPlugin = config => {
  return withXcodeProject(config, async config => {
    const projectPath = IOSConfig.Paths.getSourceRoot(config.modRequest.projectRoot);
    config.modResults = await setSplashStoryboardAsync({
      projectPath,
      projectName: config.modRequest.projectName!,
      project: config.modResults,
    });
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

export async function setSplashStoryboardAsync({
  projectPath,
  projectName,
  project,
}: {
  projectPath: string;
  projectName: string;
  project: XcodeProject;
}): Promise<XcodeProject> {
  await updatePbxProject({ projectName, project });
  return project;
}
