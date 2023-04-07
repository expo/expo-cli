import {
  AppJSONConfig,
  ExpoConfig,
  getConfig,
  getNameFromConfig,
  getWebOutputPath,
} from '@expo/config';

import { IconOptions, Manifest, PWAConfig } from './Manifest.types';

// Use root to work better with create-react-app
const DEFAULT_LANGUAGE_ISO_CODE = `en`;
const DEFAULT_DISPLAY = 'standalone';
const DEFAULT_STATUS_BAR = 'black-translucent';
const DEFAULT_PREFER_RELATED_APPLICATIONS = true;

// Convert expo value to PWA value
function ensurePWAorientation(orientation: string): string | undefined {
  if (orientation && typeof orientation === 'string') {
    const webOrientation = orientation.toLowerCase();
    if (webOrientation !== 'default') {
      return webOrientation;
    }
  }
  return undefined;
}

function sanitizePublicPath(publicPath: unknown): string {
  if (typeof publicPath !== 'string' || !publicPath.length) {
    return '/';
  }

  if (publicPath.endsWith('/')) {
    return publicPath;
  }
  return publicPath + '/';
}

export function getConfigForPWA(projectRoot: string): PWAConfig {
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  return ensurePWAConfig(exp);
}

function applyWebDefaults(appJSON: AppJSONConfig | ExpoConfig): PWAConfig {
  // For RN CLI support
  // @ts-ignore: expo object doesn't exist on ExpoConfig
  const appManifest = appJSON.expo || appJSON || {};
  const { web: webManifest = {}, splash = {}, ios = {}, android = {} } = appManifest;
  const { build: webBuild = {}, webDangerous = {}, meta = {} } = webManifest;
  const { apple = {} } = meta;

  // rn-cli apps use a displayName value as well.
  const { appName, webName } = getNameFromConfig(appJSON);

  const languageISOCode = webManifest.lang || DEFAULT_LANGUAGE_ISO_CODE;
  const buildOutputPath = getWebOutputPath(appJSON);
  const publicPath = sanitizePublicPath(webManifest.publicPath);
  const primaryColor = appManifest.primaryColor;
  const description = appManifest.description;
  const webDescription = webManifest.description || description;
  // The theme_color sets the color of the tool bar, and may be reflected in the app's preview in task switchers.
  const webThemeColor = webManifest.themeColor || primaryColor;
  const dir = webManifest.dir;
  const shortName = webManifest.shortName || webName;
  const display = webManifest.display || DEFAULT_DISPLAY;
  const startUrl = webManifest.startUrl;
  const { scope, crossorigin } = webManifest;
  const barStyle = apple.barStyle || webManifest.barStyle || DEFAULT_STATUS_BAR;

  const orientation = ensurePWAorientation(webManifest.orientation || appManifest.orientation);

  /**
   * **Splash screen background color**
   * `https://developers.google.com/web/fundamentals/web-app-manifest/#splash-screen`
   * The background_color should be the same color as the load page,
   * to provide a smooth transition from the splash screen to your app.
   */
  const backgroundColor = webManifest.backgroundColor || splash.backgroundColor; // No default background color

  /**
   *
   * https://developer.mozilla.org/en-US/docs/Web/Manifest#prefer_related_applications
   * Specifies a boolean value that hints for the user agent to indicate
   * to the user that the specified native applications (see below) are recommended over the website.
   * This should only be used if the related native apps really do offer something that the website can't... like Expo ;)
   *
   * >> The banner won't show up if the app is already installed:
   * https://github.com/GoogleChrome/samples/issues/384#issuecomment-326387680
   */
  const preferRelatedApplications =
    webManifest.preferRelatedApplications === undefined
      ? DEFAULT_PREFER_RELATED_APPLICATIONS
      : webManifest.preferRelatedApplications;

  const relatedApplications = inferWebRelatedApplicationsFromConfig(appManifest);

  return {
    ...appManifest,
    name: appName,
    description,
    primaryColor,
    // Ensure these objects exist
    ios: {
      ...ios,
    },
    android: {
      ...android,
    },
    web: {
      ...webManifest,
      meta: {
        ...meta,
        apple: {
          ...apple,
          formatDetection: apple.formatDetection || 'telephone=no',
          mobileWebAppCapable: apple.mobileWebAppCapable || 'yes',
          touchFullscreen: apple.touchFullscreen || 'yes',
          barStyle,
        },
      },
      build: {
        ...webBuild,
        output: buildOutputPath,
        publicPath,
      },
      dangerous: webDangerous,
      scope,
      crossorigin,
      description: webDescription,
      preferRelatedApplications,
      relatedApplications,
      startUrl,
      shortName,
      display,
      orientation,
      dir,
      barStyle,
      backgroundColor,
      themeColor: webThemeColor,
      lang: languageISOCode,
      name: webName,
    },
  };
}

/**
 * https://developer.mozilla.org/en-US/docs/Web/Manifest#related_applications
 * An array of native applications that are installable by, or accessible to, the underlying platform
 * for example, a native Android application obtainable through the Google Play Store.
 * Such applications are intended to be alternatives to the
 * website that provides similar/equivalent functionality — like the native app version of the website.
 */
function inferWebRelatedApplicationsFromConfig({ web = {}, ios = {}, android = {} }: any) {
  const relatedApplications = web.relatedApplications || [];

  const { bundleIdentifier, appStoreUrl } = ios;
  if (bundleIdentifier) {
    const PLATFORM_ITUNES = 'itunes';
    const iosApp = relatedApplications.some(
      ({ platform }: { platform: string }) => platform === PLATFORM_ITUNES
    );
    if (!iosApp) {
      relatedApplications.push({
        platform: PLATFORM_ITUNES,
        url: appStoreUrl,
        id: bundleIdentifier,
      });
    }
  }

  const { package: androidPackage, playStoreUrl } = android;
  if (androidPackage) {
    const PLATFORM_PLAY = 'play';
    const alreadyHasAndroidApp = relatedApplications.some(
      ({ platform }: { platform: string }) => platform === PLATFORM_PLAY
    );
    if (!alreadyHasAndroidApp) {
      relatedApplications.push({
        platform: PLATFORM_PLAY,
        url: playStoreUrl || `http://play.google.com/store/apps/details?id=${androidPackage}`,
        id: androidPackage,
      });
    }
  }

  return relatedApplications;
}

export function getSafariStartupImageConfig(config: ExpoConfig): IconOptions | null {
  // enforce no defaults
  const splashScreenObject = (input: any): IconOptions | null => {
    if (!input.image) return null;
    return {
      resizeMode: input.resizeMode,
      src: input.image,
      backgroundColor: input.backgroundColor,
    };
  };

  // Allow empty objects
  if (isObject(config.web?.splash)) {
    return splashScreenObject(config.web?.splash);
  }
  if (isObject(config.ios?.splash)) {
    return splashScreenObject(config.ios?.splash);
  }
  if (isObject(config.splash)) {
    return splashScreenObject(config.splash);
  }
  return null;
}

export function getSafariIconConfig(config: ExpoConfig): IconOptions | null {
  const validate = (input: string): IconOptions => ({
    resizeMode: 'contain',
    src: input,
    backgroundColor: 'transparent',
  });

  // Allow empty objects
  if (typeof config.ios?.icon === 'string') {
    return validate(config.ios.icon);
  }
  if (typeof config.icon === 'string') {
    return validate(config.icon);
  }
  return null;
}

export function getFaviconIconConfig(config: ExpoConfig): IconOptions | null {
  const validate = (input: string): IconOptions => ({
    resizeMode: 'contain',
    src: input,
    backgroundColor: 'transparent',
  });

  // If the favicon is set but empty, we assume that the user does not want us to generate a favicon
  if (typeof config.web?.favicon === 'string') {
    // Empty string can be used to disable favicon generation.
    if (!config.web?.favicon) {
      return null;
    }
    return validate(config.web.favicon);
  }
  if (typeof config.icon === 'string') {
    return validate(config.icon);
  }
  return null;
}

export function getChromeIconConfig(config: ExpoConfig): IconOptions | null {
  const validate = (input: string): IconOptions => ({
    resizeMode: 'contain',
    src: input,
    backgroundColor: 'transparent',
  });

  // Allow empty objects
  if (typeof config.android?.icon === 'string') {
    return validate(config.android.icon);
  }
  if (typeof config.icon === 'string') {
    return validate(config.icon);
  }
  return null;
}

function ensurePWAConfig(appJSON: AppJSONConfig | ExpoConfig): PWAConfig {
  const config = applyWebDefaults(appJSON);
  return config;
}

function isObject(item: any): item is Record<any, any> {
  return typeof item === 'object' && !Array.isArray(item) && item !== null;
}

export function createPWAManifestFromWebConfig(config?: ExpoConfig['web']): Manifest {
  if (!isObject(config)) {
    throw new Error('Web config must be a valid object');
  }

  const manifest: Manifest = {
    background_color: config.backgroundColor,
    description: config.description,
    display: config.display,
    lang: config.lang,
    name: config.name,
    scope: config.scope,
    short_name: config.shortName,
    start_url:
      typeof config.startUrl === 'undefined' ? '/?utm_source=web_app_manifest' : config.startUrl,
    theme_color: config.themeColor,
    crossorigin: config.crossorigin,
  };

  // Browser will default to auto
  if (config.dir) {
    manifest.dir = config.dir.toLowerCase() as any;
  }

  if (config.orientation) {
    manifest.orientation = config.orientation.toLowerCase() as any;
  }

  // Avoid defining an empty array, or setting prefer_related_applications to true when no applications are defined.
  if (Array.isArray(config.relatedApplications) && config.relatedApplications.length > 0) {
    manifest.related_applications = config.relatedApplications;
    manifest.prefer_related_applications = config.preferRelatedApplications;
  }

  return manifest;
}
