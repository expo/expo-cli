import { IosSplashScreenConfig, SplashScreenImageResizeMode } from '@expo/configure-splash-screen';
import fs from 'fs-extra';
import Jimp from 'jimp';
import * as path from 'path';
import { UUID, XcodeProject } from 'xcode';

import {
  ExpoConfig,
  SplashScreenImageResizeModeType,
  SplashScreenStatusBarStyleType,
} from '../Config.types';
import { addWarningIOS } from '../WarningAggregator';
import { ContentsJsonImage, writeContentsJsonAsync } from './AssetContents';
import { getPbxproj, getProjectName } from './utils/Xcodeproj';

const STORYBOARD_FILE_PATH = './SplashScreen.storyboard';
const IMAGESET_PATH = 'Images.xcassets/SplashScreen.imageset';
const BACKGROUND_IMAGESET_PATH = 'Images.xcassets/SplashScreenBackground.imageset';
const PNG_FILENAME = 'image.png';
const DARK_PNG_FILENAME = 'dark_image.png';

export function getSplashScreen(config: ExpoConfig): IosSplashScreenConfig | undefined {
  const image = config.ios?.splash?.image ?? config.splash?.image;
  if (!image) {
    return;
  }

  const result: IosSplashScreenConfig = {
    imageResizeMode:
      config.ios?.splash?.resizeMode ??
      config.splash?.resizeMode ??
      SplashScreenImageResizeMode.CONTAIN,
    backgroundColor:
      config.ios?.splash?.backgroundColor ?? config.splash?.backgroundColor ?? '#FFFFFF', // white
    image,
  };

  return result;
}

function getUIStatusBarStyle(statusBarStyle: SplashScreenStatusBarStyleType) {
  return `UIStatusBarStyle${statusBarStyle
    .replace(/(^\w)|(-\w)/g, s => s.toUpperCase())
    .replace(/-/g, '')}`;
}

function applySplashScreenPlist(
  config: ExpoConfig,
  splash: IosSplashScreenConfig | undefined
): ExpoConfig {
  if (!config.ios) {
    config.ios = {};
  }
  if (!config.ios.infoPlist) {
    config.ios.infoPlist = {};
  }

  const {
    // Remove values
    UILaunchStoryboardName,
    UIStatusBarHidden,
    UIStatusBarStyle,
    ...infoPlist
  } = config.ios.infoPlist;

  if (splash?.statusBar?.hidden) {
    infoPlist.UIStatusBarHidden = true;
  }
  if (splash?.statusBar?.style) {
    // @ts-ignore: TODO
    infoPlist.UIStatusBarStyle = getUIStatusBarStyle(splash?.statusBar?.style);
  }

  if (splash) {
    // TODO: What to do here ??
    infoPlist.UILaunchStoryboardName = 'SplashScreen';
  }

  // Mutate the config
  config.ios.infoPlist = infoPlist;

  return config;
}

export async function setSplashScreenAsync(config: ExpoConfig, projectRoot: string) {
  const splashScreenIsSupported = false; // config.sdkVersion === '39.0.0'
  if (!splashScreenIsSupported) {
    addWarningIOS(
      'splash',
      'Unable to automatically configure splash screen. Please refer to the expo-splash-screen README for more information: https://github.com/expo/expo/tree/master/packages/expo-splash-screen'
    );
    return;
  }

  const splashConfig = getSplashScreen(config);

  await applySplashScreenPlist(config, splashConfig);

  if (!splashConfig) {
    return;
  }

  const projectName = getProjectName(projectRoot);
  const projectPath = path.join(projectRoot, 'ios', projectName);
  const pbxproject = getPbxproj(projectRoot);
  try {
    await createSplashScreenBackgroundImageAsync({
      iosNamedProjectRoot: projectPath,
      splash: splashConfig,
    });
    await configureImageAssets(projectPath, splashConfig);
    // await configureIosSplashScreen(projectRoot, splashConfig);
    await configureStoryboard(
      { projectPath, projectName, pbxproject },
      {
        image: splashConfig.image,
        // @ts-ignore
        imageResizeMode: splashConfig.imageResizeMode,
      }
    );
  } catch (e) {
    addWarningIOS('splash', e);
  }
}

// TODO: Use image-utils and resize the image
async function copyImageFiles(
  iosProjectPath: string,
  imagePath?: string,
  darkModeImagePath?: string
) {
  const PNG_PATH = `${IMAGESET_PATH}/${PNG_FILENAME}`;
  const DARK_PNG_PATH = `${IMAGESET_PATH}/${DARK_PNG_FILENAME}`;

  if (imagePath) {
    await fs.copyFile(imagePath, path.resolve(iosProjectPath, PNG_PATH));
  }
  if (darkModeImagePath) {
    await fs.copyFile(darkModeImagePath, path.resolve(iosProjectPath, DARK_PNG_PATH));
  }
}

/**
 * Creates imageset containing image for Splash/Launch Screen.
 */
async function configureImageAssets(
  iosProjectPath: string,
  config: {
    image?: string;
    darkMode?: {
      image?: string;
    };
  } = {}
) {
  const imagePath = config.image;
  const darkModeImagePath = config.darkMode?.image;

  const imageSetPath = path.resolve(iosProjectPath, IMAGESET_PATH);

  // ensure old SplashScreen imageSet is removed
  await fs.remove(imageSetPath);

  if (!imagePath) {
    return;
  }

  await writeContentsJsonFile(imageSetPath, PNG_FILENAME, darkModeImagePath && DARK_PNG_FILENAME);
  await copyImageFiles(iosProjectPath, imagePath, darkModeImagePath);
}

async function createPngFileAsync(filePath: string, color: string) {
  const png = new Jimp(1, 1, color);
  return png.writeAsync(filePath);
}

async function createBackgroundImagesAsync(
  iosProjectPath: string,
  color: string,
  darkModeColor?: string
) {
  const PNG_PATH = `${BACKGROUND_IMAGESET_PATH}/${PNG_FILENAME}`;
  const DARK_PNG_PATH = `${BACKGROUND_IMAGESET_PATH}/${DARK_PNG_FILENAME}`;

  await createPngFileAsync(path.resolve(iosProjectPath, PNG_PATH), color);
  if (darkModeColor) {
    await createPngFileAsync(path.resolve(iosProjectPath, DARK_PNG_PATH), darkModeColor);
  }
}

async function createSplashScreenBackgroundImageAsync({
  iosNamedProjectRoot,
  splash,
}: {
  // Something like projectRoot/ios/MyApp/
  iosNamedProjectRoot: string;
  splash: IosSplashScreenConfig;
}) {
  const backgroundColor = splash.backgroundColor;
  const darkModeBackgroundColor = splash.darkMode?.backgroundColor;

  const imagesetPath = path.join(iosNamedProjectRoot, BACKGROUND_IMAGESET_PATH);
  // Ensure the Images.xcassets/... path exists
  await fs.remove(imagesetPath);
  await fs.ensureDir(imagesetPath);

  const darkModeEnabled = !!splash.darkMode?.backgroundColor;
  await createBackgroundImagesAsync(iosNamedProjectRoot, backgroundColor, darkModeBackgroundColor);
  await writeContentsJsonFile(
    path.resolve(iosNamedProjectRoot, BACKGROUND_IMAGESET_PATH),
    PNG_FILENAME,
    darkModeEnabled ? DARK_PNG_FILENAME : undefined
  );
}

export async function writeContentsJsonFile(
  directory: string,
  filename: string,
  darkModeFilename?: string
) {
  const images: ContentsJsonImage[] = [
    {
      idiom: 'universal' as const,
      filename,
      scale: '1x' as const,
    },
    {
      appearances: [
        {
          appearance: 'luminosity' as const,
          value: 'dark' as const,
        },
      ],
      idiom: 'universal' as const,
      filename: darkModeFilename,
      scale: '1x' as const,
    },
    {
      idiom: 'universal' as const,
      scale: '2x' as const,
    },
    {
      appearances: [
        {
          appearance: 'luminosity' as const,
          value: 'dark' as const,
        },
      ],
      idiom: 'universal' as const,
      scale: '2x' as const,
    },
    {
      idiom: 'universal' as const,
      scale: '3x' as const,
    },
    {
      appearances: [
        {
          appearance: 'luminosity' as const,
          value: 'dark' as const,
        },
      ],
      idiom: 'universal' as const,
      scale: '3x' as const,
    },
  ].filter(el => (el.appearances?.[0]?.value === 'dark' ? Boolean(darkModeFilename) : true));

  await writeContentsJsonAsync(directory, { images });
}

/**
 * @param filePath
 * @param param1.target PBXNativeTarget reference
 * @param param1.group PBXGroup reference
 */
export function addStoryboardFileToProject(
  pbxProject: XcodeProject,
  filePath: string,
  { target, group }: { target: UUID; group: UUID }
) {
  const file = pbxProject.addFile(filePath, undefined, {
    lastKnownFileType: 'file.storyboard',
    defaultEncoding: 4,
    target,
  });
  if (!file) {
    throw new Error('File already exists in the project');
  }
  delete pbxProject.pbxFileReferenceSection()[file.fileRef].explicitFileType;
  delete pbxProject.pbxFileReferenceSection()[file.fileRef].includeInIndex;

  file.uuid = pbxProject.generateUuid();
  file.target = target;

  pbxProject.addToPbxBuildFileSection(file);
  pbxProject.addToPbxResourcesBuildPhase(file);
  pbxProject.addToPbxGroup(file, group);
}

function getApplicationNativeTarget(pbxproject: XcodeProject, projectName: string) {
  const applicationNativeTarget = pbxproject.getTarget('com.apple.product-type.application');
  if (!applicationNativeTarget) {
    throw new Error(`Couldn't locate application PBXNativeTarget in '.xcodeproj' file.`);
  }

  if (String(applicationNativeTarget.target.name) !== projectName) {
    throw new Error(
      `Application native target name mismatch. Expected ${projectName}, but found ${applicationNativeTarget.target.name}.`
    );
  }
  return applicationNativeTarget;
}

/**
 * Modifies `.pbxproj` by:
 * - adding reference for `.storyboard` file
 */
function updatePbxProject({
  projectName,
  pbxproject,
}: {
  projectName: string;
  pbxproject: XcodeProject;
}): void {
  const applicationNativeTarget = getApplicationNativeTarget(pbxproject, projectName);
  // Check if `${projectName}/SplashScreen.storyboard` already exists
  // Path relative to `ios` directory
  const storyboardFilePath = path.join(projectName, STORYBOARD_FILE_PATH);
  if (!pbxproject.hasFile(storyboardFilePath)) {
    const group = pbxproject.findPBXGroupKey({ name: projectName });
    if (!group) {
      throw new Error(`Couldn't locate proper PBXGroup '.xcodeproj' file.`);
    }
    addStoryboardFileToProject(pbxproject, storyboardFilePath, {
      target: applicationNativeTarget.uuid,
      group,
    });
  }
}

/**
 * Creates [STORYBOARD] file containing ui description of Splash/Launch Screen.
 * > WARNING: modifies `pbxproj`
 */
export default async function configureStoryboard(
  {
    projectPath,
    projectName,
    pbxproject,
  }: { projectPath: string; projectName: string; pbxproject: XcodeProject },
  config: {
    imageResizeMode?: SplashScreenImageResizeModeType;
    image?: string;
  } = {}
) {
  const resizeMode: SplashScreenImageResizeModeType =
    config.imageResizeMode ?? SplashScreenImageResizeMode.CONTAIN;
  const splashScreenImagePresent = Boolean(config.image);

  let contentMode: string;
  switch (resizeMode) {
    case SplashScreenImageResizeMode.CONTAIN:
      contentMode = 'scaleAspectFit';
      break;
    case SplashScreenImageResizeMode.COVER:
      contentMode = 'scaleAspectFill';
      break;
    default:
      throw new Error(`resizeMode = ${resizeMode} is not supported for iOS platform.`);
  }

  const filePath = path.resolve(projectPath, STORYBOARD_FILE_PATH);
  await fs.ensureDir(projectPath);
  await fs.writeFile(
    filePath,
    `<?xml version="1.0" encoding="UTF-8"?>
<document
  type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB"
  version="3.0"
  toolsVersion="16096"
  targetRuntime="iOS.CocoaTouch"
  propertyAccessControl="none"
  useAutolayout="YES"
  launchScreen="YES"
  useTraitCollections="YES"
  useSafeAreas="YES"
  colorMatched="YES"
  initialViewController="EXPO-VIEWCONTROLLER-1"
>
  <device id="retina5_5" orientation="portrait" appearance="light"/>
  <dependencies>
    <deployment identifier="iOS"/>
    <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="16087"/>
    <capability name="Safe area layout guides" minToolsVersion="9.0"/>
    <capability name="documents saved in the Xcode 8 format" minToolsVersion="8.0"/>
  </dependencies>
  <scenes>
    <!--View Controller-->
    <scene sceneID="EXPO-SCENE-1">
      <objects>
        <viewController
          storyboardIdentifier="SplashScreenViewController"
          id="EXPO-VIEWCONTROLLER-1"
          sceneMemberID="viewController"
        >
          <view
            key="view"
            userInteractionEnabled="NO"
            contentMode="scaleToFill"
            insetsLayoutMarginsFromSafeArea="NO"
            id="EXPO-ContainerView"
            userLabel="ContainerView"
          >
            <rect key="frame" x="0.0" y="0.0" width="414" height="736"/>
            <autoresizingMask key="autoresizingMask" flexibleMaxX="YES" flexibleMaxY="YES"/>
            <subviews>
              <imageView
                userInteractionEnabled="NO"
                contentMode="scaleAspectFill"
                horizontalHuggingPriority="251"
                verticalHuggingPriority="251"
                insetsLayoutMarginsFromSafeArea="NO"
                image="SplashScreenBackground"
                translatesAutoresizingMaskIntoConstraints="NO"
                id="EXPO-SplashScreenBackground"
                userLabel="SplashScreenBackground"
              >
                <rect key="frame" x="0.0" y="0.0" width="414" height="736"/>
              </imageView>${
                !splashScreenImagePresent
                  ? ''
                  : `
              <imageView
                clipsSubviews="YES"
                userInteractionEnabled="NO"
                contentMode="${contentMode}"
                horizontalHuggingPriority="251"
                verticalHuggingPriority="251"
                translatesAutoresizingMaskIntoConstraints="NO"
                image="SplashScreen"
                id="EXPO-SplashScreen"
                userLabel="SplashScreen"
              >
                <rect key="frame" x="0.0" y="0.0" width="414" height="736"/>
              </imageView>`
              }
            </subviews>
            <constraints>
              <constraint firstItem="EXPO-SplashScreenBackground" firstAttribute="top" secondItem="EXPO-ContainerView" secondAttribute="top" id="1gX-mQ-vu6"/>
              <constraint firstItem="EXPO-SplashScreenBackground" firstAttribute="leading" secondItem="EXPO-ContainerView" secondAttribute="leading" id="6tX-OG-Sck"/>
              <constraint firstItem="EXPO-SplashScreenBackground" firstAttribute="trailing" secondItem="EXPO-ContainerView" secondAttribute="trailing" id="ABX-8g-7v4"/>
              <constraint firstItem="EXPO-SplashScreenBackground" firstAttribute="bottom" secondItem="EXPO-ContainerView" secondAttribute="bottom" id="jkI-2V-eW5"/>${
                !splashScreenImagePresent
                  ? ''
                  : `
              <constraint firstItem="EXPO-SplashScreen" firstAttribute="top" secondItem="EXPO-ContainerView" secondAttribute="top" id="2VS-Uz-0LU"/>
              <constraint firstItem="EXPO-SplashScreen" firstAttribute="leading" secondItem="EXPO-ContainerView" secondAttribute="leading" id="LhH-Ei-DKo"/>
              <constraint firstItem="EXPO-SplashScreen" firstAttribute="trailing" secondItem="EXPO-ContainerView" secondAttribute="trailing" id="I6l-TP-6fn"/>
              <constraint firstItem="EXPO-SplashScreen" firstAttribute="bottom" secondItem="EXPO-ContainerView" secondAttribute="bottom" id="nbp-HC-eaG"/>`
              }
            </constraints>
            <viewLayoutGuide key="safeArea" id="Rmq-lb-GrQ"/>
          </view>
        </viewController>
        <placeholder placeholderIdentifier="IBFirstResponder" id="EXPO-PLACEHOLDER-1" userLabel="First Responder" sceneMemberID="firstResponder"/>
      </objects>
      <point key="canvasLocation" x="140.625" y="129.4921875"/>
    </scene>
  </scenes>
  <resources>${
    !splashScreenImagePresent
      ? ''
      : `
    <image name="SplashScreen" width="414" height="736"/>`
  }
    <image name="SplashScreenBackground" width="1" height="1"/>
  </resources>
</document>
`
  );

  await updatePbxProject({ projectName, pbxproject });
}
