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
import Debug from 'debug';
import fs from 'fs-extra';
import Jimp from 'jimp/es';
import * as path from 'path';
import { XcodeProject } from 'xcode';

import {
  ContentsJsonImage,
  ContentsJsonImageAppearance,
  createContentsJsonItem,
  writeContentsJsonAsync,
} from '../../icons/AssetContents';
import {
  applyImageToSplashScreenXML,
  createTemplateSplashScreenAsync,
  ImageContentMode,
  toString,
} from './InterfaceBuilder';

const debug = Debug('@expo/prebuild-config:expo-splash-screen:ios');

const STORYBOARD_FILE_PATH = './SplashScreen.storyboard';
const IMAGESET_PATH = 'Images.xcassets/SplashScreen.imageset';
const BACKGROUND_IMAGESET_PATH = 'Images.xcassets/SplashScreenBackground.imageset';
const PNG_FILENAME = 'image.png';
const DARK_PNG_FILENAME = 'dark_image.png';
const TABLET_PNG_FILENAME = 'tablet_image.png';
const DARK_TABLET_PNG_FILENAME = 'dark_tablet_image.png';

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
  darkImage: string | null;
  darkBackgroundColor: string | null;
  // TODO: These are here just to test the functionality, the API should be more robust and account for tablet images.
  tabletImage: string | null;
  tabletBackgroundColor: string | null;
  // TODO: These are here just to test the functionality, the API should be more robust and account for tablet images.
  darkTabletImage: string | null;
  darkTabletBackgroundColor: string | null;
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
  } else {
    debug(`custom splash config provided`);
  }

  debug(`config:`, splash);

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
        tabletImage: splash.tabletImage,
        darkTabletImage: splash.darkTabletImage,
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
      darkBackgroundColor: splash.darkBackgroundColor,

      tabletImage: splash.tabletImage ?? null,
      tabletBackgroundColor: splash.tabletBackgroundColor,

      darkTabletImage: splash.darkTabletImage ?? null,
      darkTabletBackgroundColor: splash.darkTabletBackgroundColor,
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
      darkBackgroundColor: splash.darkBackgroundColor,

      tabletImage: null,
      tabletBackgroundColor: null,
      darkTabletImage: null,
      darkTabletBackgroundColor: null,
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
  tabletImage,
  darkTabletImage,
}: {
  projectPath: string;
  image: string;
  darkImage: string | null;
  tabletImage: string | null;
  darkTabletImage: string | null;
}) {
  await generateImagesAssetsAsync({
    async generateImageAsset(item, fileName) {
      await fs.copyFile(item, path.resolve(projectPath, IMAGESET_PATH, fileName));
    },
    anyItem: image,
    darkItem: darkImage,
    tabletItem: tabletImage,
    darkTabletItem: darkTabletImage,
  });
}

/**
 * Creates imageset containing image for Splash/Launch Screen.
 */
async function configureImageAssets({
  projectPath,
  image,
  darkImage,
  tabletImage,
  darkTabletImage,
}: {
  projectPath: string;
  image: string;
  darkImage: string | null;
  tabletImage: string | null;
  darkTabletImage: string | null;
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
    tabletImage: tabletImage ? TABLET_PNG_FILENAME : null,
    darkTabletImage: darkTabletImage ? DARK_TABLET_PNG_FILENAME : null,
  });
  await copyImageFiles({ projectPath, image, darkImage, tabletImage, darkTabletImage });
}

async function createPngFileAsync(color: string, filePath: string) {
  const png = new Jimp(1, 1, color);
  return png.writeAsync(filePath);
}

async function createBackgroundImagesAsync({
  projectPath,
  color,
  darkColor,
  tabletColor,
  darkTabletColor,
}: {
  projectPath: string;
  color: string;
  darkColor: string | null;
  tabletColor: string | null;
  darkTabletColor: string | null;
}) {
  await generateImagesAssetsAsync({
    async generateImageAsset(item, fileName) {
      await createPngFileAsync(item, path.resolve(projectPath, BACKGROUND_IMAGESET_PATH, fileName));
    },
    anyItem: color,
    darkItem: darkColor,
    tabletItem: tabletColor,
    darkTabletItem: darkTabletColor,
  });
}

async function generateImagesAssetsAsync({
  generateImageAsset,
  anyItem,
  darkItem,
  tabletItem,
  darkTabletItem,
}: {
  generateImageAsset: (item: string, fileName: string) => Promise<void>;
  anyItem: string;
  darkItem: string | null;
  tabletItem: string | null;
  darkTabletItem: string | null;
}) {
  const items = ([
    [anyItem, PNG_FILENAME],
    [darkItem, DARK_PNG_FILENAME],
    [tabletItem, TABLET_PNG_FILENAME],
    [darkTabletItem, DARK_TABLET_PNG_FILENAME],
  ].filter(([item]) => !!item) as unknown) as [string, string];

  await Promise.all(items.map(([item, fileName]) => generateImageAsset(item, fileName)));
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
  const tabletColor = splash.tabletBackgroundColor;
  const darkTabletColor = splash.darkTabletBackgroundColor;

  const imagesetPath = path.join(iosNamedProjectRoot, BACKGROUND_IMAGESET_PATH);
  // Ensure the Images.xcassets/... path exists
  await fs.remove(imagesetPath);
  await fs.ensureDir(imagesetPath);

  await createBackgroundImagesAsync({
    projectPath: iosNamedProjectRoot,
    color,
    darkColor: darkColor ? darkColor : null,
    tabletColor: tabletColor ? tabletColor : null,
    darkTabletColor: darkTabletColor ? darkTabletColor : null,
  });

  await writeContentsJsonFileAsync({
    assetPath: path.resolve(iosNamedProjectRoot, BACKGROUND_IMAGESET_PATH),
    image: PNG_FILENAME,
    darkImage: darkColor ? DARK_PNG_FILENAME : null,
    tabletImage: tabletColor ? TABLET_PNG_FILENAME : null,
    darkTabletImage: darkTabletColor ? DARK_TABLET_PNG_FILENAME : null,
  });
}

const darkAppearances: ContentsJsonImageAppearance[] = [
  {
    appearance: 'luminosity',
    value: 'dark',
  } as ContentsJsonImageAppearance,
];

export function buildContentsJsonImages({
  image,
  darkImage,
  tabletImage,
  darkTabletImage,
}: {
  image: string;
  tabletImage: string | null;
  darkImage: string | null;
  darkTabletImage: string | null;
}): ContentsJsonImage[] {
  const images: ContentsJsonImage[] = [
    // Phone light
    createContentsJsonItem({
      idiom: 'universal',
      filename: image,
      scale: '1x',
    }),
    createContentsJsonItem({
      idiom: 'universal',
      scale: '2x',
    }),
    createContentsJsonItem({
      idiom: 'universal',
      scale: '3x',
    }),
    // Phone dark
    darkImage &&
      createContentsJsonItem({
        idiom: 'universal',
        appearances: darkAppearances,
        filename: darkImage,
        scale: '1x',
      }),
    darkImage &&
      createContentsJsonItem({
        idiom: 'universal',
        appearances: darkAppearances,
        scale: '2x',
      }),
    darkImage &&
      createContentsJsonItem({
        idiom: 'universal',
        appearances: darkAppearances,
        scale: '3x',
      }),
    // Tablet light
    tabletImage &&
      createContentsJsonItem({
        idiom: 'ipad',
        filename: tabletImage,
        scale: '1x',
      }),
    tabletImage &&
      createContentsJsonItem({
        idiom: 'ipad',
        scale: '2x',
      }),
    // Phone dark
    darkTabletImage &&
      createContentsJsonItem({
        idiom: 'ipad',
        appearances: darkAppearances,
        filename: darkTabletImage ?? undefined,
        scale: '1x',
      }),
    darkTabletImage &&
      createContentsJsonItem({
        idiom: 'ipad',
        appearances: darkAppearances,
        scale: '2x',
      }),
  ].filter(Boolean) as ContentsJsonImage[];

  return images;
}

async function writeContentsJsonFileAsync({
  assetPath,
  image,
  darkImage,
  tabletImage,
  darkTabletImage,
}: {
  assetPath: string;
  image: string;
  darkImage: string | null;
  tabletImage: string | null;
  darkTabletImage: string | null;
}) {
  const images = buildContentsJsonImages({ image, darkImage, tabletImage, darkTabletImage });

  debug(`create contents.json:`, assetPath);
  debug(`use images:`, images);
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
