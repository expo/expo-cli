import { WarningAggregator } from '@expo/config-plugins';
import { ExpoConfig } from '@expo/config-types';

type ExpoConfigIosSplash = NonNullable<NonNullable<ExpoConfig['ios']>['splash']>;

const defaultResizeMode = 'contain';
const defaultBackgroundColor = '#ffffff';

export interface IOSSplashConfig {
  image: string;
  // tabletImage: string | null;
  backgroundColor: string;
  resizeMode: NonNullable<ExpoConfigIosSplash['resizeMode']>;
  tabletImage: string | null;
  // TODO: These are here just to test the functionality, the API should be more robust and account for tablet images.
  tabletBackgroundColor: string | null;
  dark?: {
    image?: string | null;
    backgroundColor?: string | null;
    tabletImage?: string | null;
    tabletBackgroundColor?: string | null;
  };
}

// TODO: Maybe use an array on splash with theme value. Then remove the array in serialization for legacy and manifest.
export function getIosSplashConfig(config: ExpoConfig): IOSSplashConfig | null {
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
      tabletImage: splash.tabletImage ?? null,
      tabletBackgroundColor: splash.tabletBackgroundColor,
      dark: {
        image: splash.dark?.image ?? null,
        backgroundColor: splash.dark?.backgroundColor,
        tabletImage: splash.dark?.tabletImage ?? null,
        tabletBackgroundColor: splash.dark?.tabletBackgroundColor,
      },
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
      tabletImage: null,
      tabletBackgroundColor: null,
      dark: {
        image: null,
        backgroundColor: null,
        tabletImage: null,
        tabletBackgroundColor: null,
      },
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
}
