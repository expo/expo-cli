import fs from 'fs-extra';
import Jimp from 'jimp';
import * as path from 'path';
import { XcodeProject } from 'xcode';

import { InfoPlist } from '.';
import { ExpoConfig } from '../Config.types';
import { assert } from '../Errors';
import { ConfigPlugin } from '../Plugin.types';
import { addWarningIOS } from '../WarningAggregator';
import { withPlugins } from '../plugins/core-plugins';
import { createInfoPlistPlugin, withDangerousMod, withXcodeProject } from '../plugins/ios-plugins';
import {
  ContentsJsonImage,
  ContentsJsonImageAppearance,
  ContentsJsonImageIdiom,
  ContentsJsonImageScale,
  writeContentsJsonAsync,
} from './AssetContents';
import * as Paths from './Paths';
import { getUserInterfaceStyle } from './UserInterfaceStyle';
import { addStoryboardFileToProject, getApplicationNativeTarget } from './utils/Xcodeproj';

const STORYBOARD_FILE_PATH = './SplashScreen.storyboard';
const IMAGESET_PATH = 'Images.xcassets/SplashScreen.imageset';
const BACKGROUND_IMAGESET_PATH = 'Images.xcassets/SplashScreenBackground.imageset';
const PNG_FILENAME = 'image.png';
const DARK_PNG_FILENAME = 'dark_image.png';

type ExpoConfigIosSplash = NonNullable<NonNullable<ExpoConfig['ios']>['splash']>;

const defaultResizeMode = 'contain';
const defaultBackgroundColor = '#ffffff';
const defaultUserInterfaceStyle = 'automatic';

export interface IOSSplashConfig {
  image: string;
  // tabletImage: string | null;
  backgroundColor: string;
  resizeMode: NonNullable<ExpoConfigIosSplash['resizeMode']>;
  userInterfaceStyle: NonNullable<ExpoConfigIosSplash['userInterfaceStyle']>;
  // TODO: These are here just to test the functionality, the API should be more robust and account for tablet images.
  darkImage: string;
  darkBackgroundColor: string;
}

export const withSplashScreen: ConfigPlugin = config => {
  // only warn once
  warnUnsupportedSplashProperties(config);

  return withPlugins(config, [
    withSplashScreenInfoPlist,
    withSplashScreenAssets,
    withSplashXcodeProject,
  ]);
};

const withSplashScreenInfoPlist = createInfoPlistPlugin(setSplashInfoPlist);

const withSplashScreenAssets: ConfigPlugin = config => {
  return withDangerousMod(config, async config => {
    const splashConfig = getSplashConfig(config);
    if (!splashConfig) {
      return config;
    }
    const projectPath = Paths.getSourceRoot(config.modRequest.projectRoot);

    await createSplashScreenBackgroundImageAsync({
      iosNamedProjectRoot: projectPath,
      splash: splashConfig,
    });

    await configureImageAssets({
      projectPath,
      image: splashConfig.image,
      darkImage: splashConfig.darkImage,
    });

    return config;
  });
};

const withSplashXcodeProject: ConfigPlugin = config => {
  return withXcodeProject(config, async config => {
    const splashConfig = getSplashConfig(config);
    if (!splashConfig) {
      return config;
    }
    const projectPath = Paths.getSourceRoot(config.modRequest.projectRoot);
    config.modResults = await setSplashStoryboardAsync(
      { projectPath, projectName: config.modRequest.projectName!, project: config.modResults },
      splashConfig
    );
    return config;
  });
};

export function setSplashInfoPlist(config: ExpoConfig, infoPlist: InfoPlist): InfoPlist {
  const splash = getSplashConfig(config);
  if (!splash) {
    return infoPlist;
  }

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
  } else {
    delete infoPlist.UIUserInterfaceStyle;
  }

  if (splash) {
    // TODO: What to do here ??
    infoPlist.UILaunchStoryboardName = 'SplashScreen';
  } else {
    delete infoPlist.UILaunchStoryboardName;
  }

  return infoPlist;
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

export function warnUnsupportedSplashProperties(config: ExpoConfig) {
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
}

async function copyImageFiles({
  projectPath,
  image,
  darkImage,
}: {
  projectPath: string;
  image: string;
  darkImage: string | null;
}) {
  if (image) {
    await fs.copyFile(image, path.resolve(projectPath, IMAGESET_PATH, PNG_FILENAME));
  }
  if (darkImage) {
    await fs.copyFile(darkImage, path.resolve(projectPath, IMAGESET_PATH, DARK_PNG_FILENAME));
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

  await writeContentsJsonFileAsync({
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
  await createPngFileAsync(
    path.resolve(projectPath, BACKGROUND_IMAGESET_PATH, PNG_FILENAME),
    color
  );
  if (darkColor) {
    await createPngFileAsync(
      path.resolve(projectPath, BACKGROUND_IMAGESET_PATH, DARK_PNG_FILENAME),
      darkColor
    );
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
  await writeContentsJsonFileAsync({
    assetPath: path.resolve(iosNamedProjectRoot, BACKGROUND_IMAGESET_PATH),
    image: PNG_FILENAME,
    darkImage: darkModeEnabled ? DARK_PNG_FILENAME : null,
  });
}

export function buildContentsJsonImages({
  image,
  darkImage,
}: {
  image: string;
  darkImage: string | null;
}): ContentsJsonImage[] {
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

  return images;
}

async function writeContentsJsonFileAsync({
  assetPath,
  image,
  darkImage,
}: {
  assetPath: string;
  image: string;
  darkImage: string | null;
}) {
  const images = buildContentsJsonImages({ image, darkImage });

  await writeContentsJsonAsync(assetPath, { images });
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
    assert(group, `Couldn't locate proper PBXGroup (${projectName}) '.xcodeproj' file.`);
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
export async function setSplashStoryboardAsync(
  {
    projectPath,
    projectName,
    project,
  }: { projectPath: string; projectName: string; project: XcodeProject },
  config: Pick<IOSSplashConfig, 'image' | 'resizeMode'>
): Promise<XcodeProject> {
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
  return project;
}
