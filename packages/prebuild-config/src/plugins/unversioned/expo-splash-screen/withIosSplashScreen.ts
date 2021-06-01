import {
  ConfigPlugin,
  InfoPlist,
  IOSConfig,
  WarningAggregator,
  withDangerousMod,
  withInfoPlist,
  withPlugins,
  withXcodeProject,
} from '@expo/config-plugins';
import { ExpoConfig } from '@expo/config-types';
import fs from 'fs-extra';
import Jimp from 'jimp/es';
import * as path from 'path';
import { XcodeProject } from 'xcode';

import {
  ContentsJsonImage,
  ContentsJsonImageAppearance,
  ContentsJsonImageIdiom,
  ContentsJsonImageScale,
  writeContentsJsonAsync,
} from '../../icons/AssetContents';
import {
  applyImageToSplashScreenXML,
  createTemplateSplashScreenAsync,
  ImageContentMode,
  toString,
} from './InterfaceBuilder';

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

export const withIosSplashScreen: ConfigPlugin<IOSSplashConfig | undefined | null | void> = (
  config,
  splash
) => {
  // only warn once
  warnUnsupportedSplashProperties(config);

  // If the user didn't specify a splash object, infer the splash object from the Expo config.
  if (!splash) {
    splash = getSplashConfig(config);
  }

  return withPlugins(config, [
    [withSplashScreenInfoPlist, splash],
    [withSplashScreenAssets, splash],
    [withSplashXcodeProject, splash],
  ]);
};

const withSplashScreenInfoPlist: ConfigPlugin<IOSSplashConfig> = (config, splash) => {
  return withInfoPlist(config, async config => {
    config.modResults = await setSplashInfoPlist(config, config.modResults, splash);
    return config;
  });
};

const withSplashScreenAssets: ConfigPlugin<IOSSplashConfig> = (config, splash) => {
  return withDangerousMod(config, [
    'ios',
    async config => {
      if (!splash) {
        return config;
      }
      const projectPath = IOSConfig.Paths.getSourceRoot(config.modRequest.projectRoot);

      await createSplashScreenBackgroundImageAsync({
        iosNamedProjectRoot: projectPath,
        splash,
      });

      await configureImageAssets({
        projectPath,
        image: splash.image,
        darkImage: splash.darkImage,
      });

      return config;
    },
  ]);
};

const withSplashXcodeProject: ConfigPlugin<IOSSplashConfig> = (config, splash) => {
  return withXcodeProject(config, async config => {
    const projectPath = IOSConfig.Paths.getSourceRoot(config.modRequest.projectRoot);
    config.modResults = await setSplashStoryboardAsync(
      { projectPath, projectName: config.modRequest.projectName!, project: config.modResults },
      splash
    );
    return config;
  });
};

export function setSplashInfoPlist(
  config: ExpoConfig,
  infoPlist: InfoPlist,
  splash: IOSSplashConfig
): InfoPlist {
  const isDarkModeEnabled = !!splash?.darkImage;

  if (isDarkModeEnabled) {
    const existing = IOSConfig.UserInterfaceStyle.getUserInterfaceStyle(config);
    // Add a warning to prevent the dark mode splash screen from not being shown -- this was learned the hard way.
    if (existing && existing !== 'automatic') {
      WarningAggregator.addWarningIOS(
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
      // If the user defined other properties but failed to define an image, warn.
      if (Object.keys(splash).length) {
        warnSplashMissingImage();
      }
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
      // If the user defined other properties but failed to define an image, warn.
      if (Object.keys(splash).length) {
        warnSplashMissingImage();
      }
      return null;
    }

    return {
      image,
      resizeMode: splash.resizeMode ?? defaultResizeMode,
      backgroundColor: splash.backgroundColor ?? defaultBackgroundColor,
      userInterfaceStyle: defaultUserInterfaceStyle,

      darkImage: splash.darkImage ?? null,
      darkBackgroundColor: splash.darkBackgroundColor ?? '#000000',
    };
  }

  return null;
}

function warnSplashMissingImage() {
  WarningAggregator.addWarningIOS(
    'splash-config',
    'splash config object is missing an image property'
  );
}

export function warnUnsupportedSplashProperties(config: ExpoConfig) {
  if (config.ios?.splash?.xib) {
    WarningAggregator.addWarningIOS(
      'splash',
      'ios.splash.xib is not supported in prebuild. Please use ios.splash.image instead.'
    );
  }
  if (config.ios?.splash?.tabletImage) {
    WarningAggregator.addWarningIOS(
      'splash',
      'ios.splash.tabletImage is not supported in prebuild. Please use ios.splash.image instead.'
    );
  }
  if (config.ios?.splash?.userInterfaceStyle) {
    WarningAggregator.addWarningIOS(
      'splash',
      'ios.splash.userInterfaceStyle is not supported in prebuild. Please use ios.splash.darkImage (TODO) instead.'
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
  // Check if `${projectName}/SplashScreen.storyboard` already exists
  // Path relative to `ios` directory
  const storyboardFilePath = path.join(projectName, STORYBOARD_FILE_PATH);
  if (!project.hasFile(storyboardFilePath)) {
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
