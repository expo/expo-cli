import { SplashScreenImageResizeMode } from '@expo/configure-splash-screen';
import fs from 'fs-extra';
import Jimp from 'jimp';
import * as path from 'path';
import { UUID, XcodeProject } from 'xcode';

import { ExpoConfig, SplashScreenImageResizeModeType } from '../Config.types';
import { addWarningIOS } from '../WarningAggregator';
import {
  ContentsJsonImage,
  ContentsJsonImageAppearance,
  ContentsJsonImageIdiom,
  ContentsJsonImageScale,
  writeContentsJsonAsync,
} from './AssetContents';
import * as Paths from './Paths';
import { getUserInterfaceStyle } from './UserInterfaceStyle';
import { getApplicationNativeTarget, getPbxproj } from './utils/Xcodeproj';

const STORYBOARD_FILE_PATH = './SplashScreen.storyboard';
const IMAGESET_PATH = 'Images.xcassets/SplashScreen.imageset';
const BACKGROUND_IMAGESET_PATH = 'Images.xcassets/SplashScreenBackground.imageset';
const PNG_FILENAME = 'image.png';
const DARK_PNG_FILENAME = 'dark_image.png';

type ExpoConfigIosSplash = NonNullable<NonNullable<ExpoConfig['ios']>['splash']>;

const defaultResizeMode = 'contain';
const defaultBackgroundColor = '#ffffff';
const defaultUserInterfaceStyle = 'automatic';

type StatusBarStyle = 'auto' | 'light' | 'dark'; // | 'inverted'

interface StatusBarConfig {
  /**
   * Sets the color of the status bar text. Default value is "auto" which
   * picks the appropriate value according to the active color scheme, eg:
   * if your app is dark mode, the style will be "light".
   */
  style?: StatusBarStyle;

  /**
   * If the status bar is hidden.
   */
  hidden?: boolean;

  /**
   * The background color of the status bar.
   *
   * @platform android
   */
  backgroundColor?: string;

  /**
   * If the status bar is translucent. When translucent is set to true,
   * the app will draw under the status bar. This is the default in
   * projects created with Expo tools because it is consistent with iOS.
   *
   * @platform android
   */
  translucent?: boolean;
}
export interface IOSSplashConfig {
  image: string;
  // tabletImage: string | null;
  backgroundColor: string;
  resizeMode: NonNullable<ExpoConfigIosSplash['resizeMode']>;
  userInterfaceStyle: NonNullable<ExpoConfigIosSplash['userInterfaceStyle']>;
  // TODO: DARK
  darkImage: string;
  darkBackgroundColor: string;
  // Resize mode cannot be supported for dark mode:
  // darkResizeMode: NonNullable<ExpoConfigIosSplash['resizeMode']>;
  // TODO: Status bar
  // statusBar: StatusBarConfig | null;
}

// TODO: Maybe use an array on splash with theme value. Then remove the array in serialization for legacy and manifest.
export function getSplashConfig(config: ExpoConfig): IOSSplashConfig | null {
  // Respect the splash screen object, don't mix and match across different splash screen objects
  // in case the user wants the top level splash to apply to every platform except iOS.
  if (config.ios?.splash) {
    const splash = config.ios?.splash;
    const image = splash.image ?? null;
    if (!image) {
      // currently we don't support using a splash screen object if it doesn't have an image defined.
      return null;
    }
    return {
      image,
      resizeMode: splash.resizeMode ?? defaultResizeMode,
      backgroundColor: splash.backgroundColor ?? defaultBackgroundColor,
      userInterfaceStyle: splash.userInterfaceStyle ?? defaultUserInterfaceStyle,
      // tabletImage: splash.tabletImage ?? image,

      darkImage: splash.darkImage ?? null,
      darkBackgroundColor: splash.darkBackgroundColor ?? '#000000',
    };
  }

  if (config.splash) {
    const splash = config.splash;
    const image = splash.image ?? null;
    if (!image) {
      return null;
    }
    return {
      image,
      resizeMode: splash.resizeMode ?? defaultResizeMode,
      backgroundColor: splash.backgroundColor ?? defaultBackgroundColor,
      userInterfaceStyle: defaultUserInterfaceStyle,
      // tabletImage: image,

      darkImage: splash.darkImage ?? null,
      darkBackgroundColor: splash.darkBackgroundColor ?? '#000000',
    };
  }

  return null;
}

function getUIStatusBarStyle(statusBarStyle: StatusBarStyle): string {
  return `UIStatusBarStyle${statusBarStyle
    .replace(/(^\w)|(-\w)/g, s => s.toUpperCase())
    .replace(/-/g, '')}`;
}

function setStatusBarInfoPlist(
  config: ExpoConfig,
  statusBar: Pick<StatusBarConfig, 'hidden' | 'style'> | null
): ExpoConfig {
  if (!config.ios) {
    config.ios = {};
  }
  if (!config.ios.infoPlist) {
    config.ios.infoPlist = {};
  }

  const {
    // Remove values
    UIStatusBarHidden,
    UIStatusBarStyle,
    ...infoPlist
  } = config.ios.infoPlist;

  if (statusBar?.hidden != null) {
    infoPlist.UIStatusBarHidden = !!statusBar.hidden;
  }

  if (statusBar?.style) {
    infoPlist.UIStatusBarStyle = getUIStatusBarStyle(statusBar.style);
  }

  // Mutate the config
  config.ios.infoPlist = infoPlist;

  return config;
}

function setSplashInfoPlist(config: ExpoConfig, splash: IOSSplashConfig | null): ExpoConfig {
  if (!config.ios) {
    config.ios = {};
  }
  if (!config.ios.infoPlist) {
    config.ios.infoPlist = {};
  }

  const {
    // Remove values
    UILaunchStoryboardName,
    UIUserInterfaceStyle,
    ...infoPlist
  } = config.ios.infoPlist;

  const isDarkModeEnabled = !!splash?.darkImage;

  if (isDarkModeEnabled) {
    const existing = getUserInterfaceStyle(config);
    // Add a warning to prevent the dark mode splash screen from not being shown -- this was learned the hard way.
    if (existing && existing !== 'automatic') {
      addWarningIOS(
        'splash',
        'The existing `userInterfaceStyle` property is preventing splash screen from working properly. Please remove it or disable dark mode splash screens.'
      );
    }
    // assigning it to auto anyways, but this is fragile because the order of operations matter now
    infoPlist.UIUserInterfaceStyle = 'Automatic';
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
  const splashConfig = getSplashConfig(config);

  config = await setSplashInfoPlist(config, splashConfig);
  // config = await setStatusBarInfoPlist(config, splashConfig);

  if (!splashConfig) {
    return;
  }

  if (config.ios?.splash?.xib) {
    addWarningIOS(
      'splash',
      'ios.splash.xib is not supported in bare workflow. Please use ios.splash.image instead.'
    );
  }
  if (config.ios?.splash?.tabletImage) {
    addWarningIOS(
      'splash',
      'ios.splash.tabletImage is not supported in bare workflow. Please use ios.splash.image instead.'
    );
  }
  if (config.ios?.splash?.userInterfaceStyle) {
    addWarningIOS(
      'splash',
      'ios.splash.userInterfaceStyle is not supported in bare workflow. Please use ios.splash.darkImage (TODO) instead.'
    );
  }

  const { projectName, projectPath } = Paths.getPaths(projectRoot);
  const project = getPbxproj(projectRoot);
  try {
    await createSplashScreenBackgroundImageAsync({
      iosNamedProjectRoot: projectPath,
      splash: splashConfig,
    });
    await configureImageAssets({
      projectPath,
      image: splashConfig.image,
      darkImage: splashConfig.darkImage,
    });
    await configureStoryboard({ projectPath, projectName, project }, splashConfig);
  } catch (e) {
    addWarningIOS('splash', e);
  }
}

// TODO: Use image-utils and resize the image
async function copyImageFiles({
  projectPath,
  image,
  darkImage,
}: {
  projectPath: string;
  image: string;
  darkImage: string | null;
}) {
  const PNG_PATH = `${IMAGESET_PATH}/${PNG_FILENAME}`;
  const DARK_PNG_PATH = `${IMAGESET_PATH}/${DARK_PNG_FILENAME}`;

  if (image) {
    await fs.copyFile(image, path.resolve(projectPath, PNG_PATH));
  }
  if (darkImage) {
    await fs.copyFile(darkImage, path.resolve(projectPath, DARK_PNG_PATH));
  }
}

/**
 * Creates imageset containing image for Splash/Launch Screen.
 */
async function configureImageAssets({
  projectPath,
  image,
  darkImage,
}: {
  projectPath: string;
  image: string;
  darkImage: string | null;
}) {
  const imageSetPath = path.resolve(projectPath, IMAGESET_PATH);

  // ensure old SplashScreen imageSet is removed
  await fs.remove(imageSetPath);

  if (!image) {
    return;
  }

  await writeContentsJsonFile({
    assetPath: imageSetPath,
    image: PNG_FILENAME,
    darkImage: darkImage ? DARK_PNG_FILENAME : null,
  });
  await copyImageFiles({ projectPath, image, darkImage });
}

async function createPngFileAsync(filePath: string, color: string) {
  const png = new Jimp(1, 1, color);
  return png.writeAsync(filePath);
}

async function createBackgroundImagesAsync({
  projectPath,
  color,
  darkColor,
}: {
  projectPath: string;
  color: string;
  darkColor: string | null;
}) {
  const PNG_PATH = `${BACKGROUND_IMAGESET_PATH}/${PNG_FILENAME}`;
  const DARK_PNG_PATH = `${BACKGROUND_IMAGESET_PATH}/${DARK_PNG_FILENAME}`;

  await createPngFileAsync(path.resolve(projectPath, PNG_PATH), color);
  if (darkColor) {
    await createPngFileAsync(path.resolve(projectPath, DARK_PNG_PATH), darkColor);
  }
}

async function createSplashScreenBackgroundImageAsync({
  iosNamedProjectRoot,
  splash,
}: {
  // Something like projectRoot/ios/MyApp/
  iosNamedProjectRoot: string;
  splash: IOSSplashConfig;
}) {
  const color = splash.backgroundColor;
  const darkColor = splash.darkBackgroundColor;

  const imagesetPath = path.join(iosNamedProjectRoot, BACKGROUND_IMAGESET_PATH);
  // Ensure the Images.xcassets/... path exists
  await fs.remove(imagesetPath);
  await fs.ensureDir(imagesetPath);

  const darkModeEnabled = !!splash.darkImage;
  await createBackgroundImagesAsync({
    projectPath: iosNamedProjectRoot,
    color,
    darkColor: darkModeEnabled ? darkColor : null,
  });
  await writeContentsJsonFile({
    assetPath: path.resolve(iosNamedProjectRoot, BACKGROUND_IMAGESET_PATH),
    image: PNG_FILENAME,
    darkImage: darkModeEnabled ? DARK_PNG_FILENAME : null,
  });
}

export async function writeContentsJsonFile({
  assetPath,
  image,
  darkImage,
}: {
  assetPath: string;
  image: string;
  darkImage: string | null;
}) {
  const idiom: ContentsJsonImageIdiom = 'universal';
  const images: ContentsJsonImage[] = [
    {
      idiom,
      filename: image,
      scale: '1x' as ContentsJsonImageScale,
    },
    {
      appearances: [
        {
          appearance: 'luminosity',
          value: 'dark',
        } as ContentsJsonImageAppearance,
      ],
      idiom,
      filename: darkImage ?? undefined,
      scale: '1x' as ContentsJsonImageScale,
    },
    {
      idiom,
      scale: '2x' as ContentsJsonImageScale,
    },
    {
      appearances: [
        {
          appearance: 'luminosity',
          value: 'dark',
        } as ContentsJsonImageAppearance,
      ],
      idiom,
      scale: '2x' as ContentsJsonImageScale,
    },
    {
      idiom,
      scale: '3x' as ContentsJsonImageScale,
    },
    {
      appearances: [
        {
          appearance: 'luminosity',
          value: 'dark',
        } as ContentsJsonImageAppearance,
      ],
      idiom,
      scale: '3x' as ContentsJsonImageScale,
    },
  ].filter(el => (el.appearances?.[0]?.value === 'dark' ? Boolean(darkImage) : true));

  await writeContentsJsonAsync(assetPath, { images });
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
  const applicationNativeTarget = getApplicationNativeTarget({ project, projectName });
  // Check if `${projectName}/SplashScreen.storyboard` already exists
  // Path relative to `ios` directory
  const storyboardFilePath = path.join(projectName, STORYBOARD_FILE_PATH);
  if (!project.hasFile(storyboardFilePath)) {
    const group = project.findPBXGroupKey({ name: projectName });
    if (!group) {
      throw new Error(`Couldn't locate proper PBXGroup '.xcodeproj' file.`);
    }
    addStoryboardFileToProject(project, storyboardFilePath, {
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
    project,
  }: { projectPath: string; projectName: string; project: XcodeProject },
  config: Pick<IOSSplashConfig, 'image' | 'resizeMode'>
) {
  const resizeMode = config.resizeMode;
  const splashScreenImagePresent = Boolean(config.image);

  let contentMode: string;
  switch (resizeMode) {
    case 'contain':
      contentMode = 'scaleAspectFit';
      break;
    case 'cover':
      contentMode = 'scaleAspectFill';
      break;
    default:
      throw new Error(`{ resizeMode: "${resizeMode}" } is not supported for iOS platform.`);
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
            <color key="backgroundColor" systemColor="systemBackgroundColor"/>
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

  await updatePbxProject({ projectName, project });
}
