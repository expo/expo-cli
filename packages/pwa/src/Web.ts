import {
  AppJSONConfig,
  ExpoConfig,
  getConfig,
  getNameFromConfig,
  getWebOutputPath,
} from '@expo/config';
import { Manifest } from './Web.types';

// To work with the iPhone X "notch" add `viewport-fit=cover` to the `viewport` meta tag.
const DEFAULT_VIEWPORT =
  'width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1.00001,viewport-fit=cover';
// Use root to work better with create-react-app
const DEFAULT_ROOT_ID = `root`;
const DEFAULT_LANGUAGE_ISO_CODE = `en`;
const DEFAULT_NO_JS_MESSAGE = `Oh no! It looks like JavaScript is not enabled in your browser.`;
const DEFAULT_BACKGROUND_COLOR = '#ffffff';
const DEFAULT_START_URL = '.';
const DEFAULT_DISPLAY = 'standalone';
const DEFAULT_STATUS_BAR = 'black-translucent';
const DEFAULT_LANG_DIR = 'auto';
const DEFAULT_ORIENTATION = 'any';
const ICON_SIZES = [192, 512];
const DEFAULT_PREFER_RELATED_APPLICATIONS = true;

// Convert expo value to PWA value
function ensurePWAorientation(orientation: string): string {
  if (orientation && typeof orientation === 'string') {
    let webOrientation = orientation.toLowerCase();
    if (webOrientation !== 'default') {
      return webOrientation;
    }
  }
  return DEFAULT_ORIENTATION;
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

export function getConfigForPWA(
  projectRoot: string,
  getAbsolutePath: (...pathComponents: string[]) => string,
  options: { templateIcon: string }
) {
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  return ensurePWAConfig(exp, getAbsolutePath, options);
}

function applyWebDefaults(appJSON: AppJSONConfig | ExpoConfig): ExpoConfig {
  // For RN CLI support
  const appManifest = appJSON.expo || appJSON || {};
  const { web: webManifest = {}, splash = {}, ios = {}, android = {} } = appManifest;
  const { build: webBuild = {}, webDangerous = {}, meta = {} } = webManifest;
  const { apple = {} } = meta;

  // rn-cli apps use a displayName value as well.
  const { appName, webName } = getNameFromConfig(appJSON);

  const languageISOCode = webManifest.lang || DEFAULT_LANGUAGE_ISO_CODE;
  const noJavaScriptMessage = webDangerous.noJavaScriptMessage || DEFAULT_NO_JS_MESSAGE;
  const rootId = webBuild.rootId || DEFAULT_ROOT_ID;
  const buildOutputPath = getWebOutputPath(appJSON);
  const publicPath = sanitizePublicPath(webManifest.publicPath);
  const primaryColor = appManifest.primaryColor;
  const description = appManifest.description;
  // The theme_color sets the color of the tool bar, and may be reflected in the app's preview in task switchers.
  const webThemeColor = webManifest.themeColor || primaryColor;
  const dir = webManifest.dir || DEFAULT_LANG_DIR;
  const shortName = webManifest.shortName || webName;
  const display = webManifest.display || DEFAULT_DISPLAY;
  const startUrl = webManifest.startUrl || DEFAULT_START_URL;
  const webViewport = meta.viewport || DEFAULT_VIEWPORT;
  const { scope, crossorigin } = webManifest;
  const barStyle = apple.barStyle || webManifest.barStyle || DEFAULT_STATUS_BAR;

  const orientation = ensurePWAorientation(webManifest.orientation || appManifest.orientation);

  /**
   * **Splash screen background color**
   * `https://developers.google.com/web/fundamentals/web-app-manifest/#splash-screen`
   * The background_color should be the same color as the load page,
   * to provide a smooth transition from the splash screen to your app.
   */
  const backgroundColor =
    webManifest.backgroundColor || splash.backgroundColor || DEFAULT_BACKGROUND_COLOR; // No default background color

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
        viewport: webViewport,
      },
      build: {
        ...webBuild,
        output: buildOutputPath,
        rootId,
        publicPath,
      },
      dangerous: {
        ...webDangerous,
        noJavaScriptMessage,
      },
      scope,
      crossorigin,
      description,
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
    let iosApp = relatedApplications.some(
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

function inferWebHomescreenIcons(
  config: any = {},
  getAbsolutePath: (...pathComponents: string[]) => string,
  options: any
) {
  const { web = {}, ios = {} } = config;
  if (Array.isArray(web.icons)) {
    return web.icons;
  }
  let icons = [];
  let icon;
  if (web.icon || config.icon) {
    icon = getAbsolutePath(web.icon || config.icon);
  } else {
    // Use template icon
    icon = options.templateIcon;
  }
  const destination = `apple/icons`;
  icons.push({ src: icon, size: ICON_SIZES, destination });
  const iOSIcon = config.icon || ios.icon;
  if (iOSIcon) {
    const iOSIconPath = getAbsolutePath(iOSIcon);
    icons.push({
      ios: true,
      sizes: 180,
      src: iOSIconPath,
      destination,
    });
  }
  return icons;
}

function inferWebStartupImages(
  config: ExpoConfig,
  getAbsolutePath: (...pathComponents: string[]) => string,
  options: Object
) {
  const { icon, splash = {}, primaryColor } = config;
  const { web } = config;
  // @ts-ignore
  if (Array.isArray(web?.startupImages)) {
    // @ts-ignore
    return web?.startupImages;
  }

  let startupImages = [];

  let splashImageSource;
  const possibleIconSrc = web?.splash?.image || splash.image || icon;
  if (possibleIconSrc) {
    const resizeMode = web?.splash?.resizeMode || splash.resizeMode || 'contain';
    const backgroundColor =
      web?.splash?.backgroundColor || splash.backgroundColor || primaryColor || '#ffffff';
    splashImageSource = getAbsolutePath(possibleIconSrc);
    startupImages.push({
      resizeMode,
      color: backgroundColor,
      src: splashImageSource,
      destination: `apple/splash`,
    });
  }
  return startupImages;
}

function ensurePWAConfig(
  appJSON: AppJSONConfig | ExpoConfig,
  getAbsolutePath: ((...pathComponents: string[]) => string) | undefined,
  options: object
): ExpoConfig {
  const config = applyWebDefaults(appJSON);
  if (getAbsolutePath) {
    if (!config.web) config.web = {};
    config.web.icons = inferWebHomescreenIcons(config, getAbsolutePath, options);
    config.web.startupImages = inferWebStartupImages(config, getAbsolutePath, options);
  }
  return config;
}

function isObject(item: any): boolean {
  return typeof item === 'object' && !Array.isArray(item) && item !== null;
}

export function createPWAManifestFromConfig(appJson: ExpoConfig): Manifest {
  if (!isObject(appJson)) {
    throw new Error('app.json must be an object');
  }

  const { web: config = {} } = appJson;

  const manifest: Manifest = {
    background_color: config.backgroundColor,
    description: config.description,
    dir: config.dir,
    display: config.display,
    lang: config.lang,
    name: config.name,
    orientation: config.orientation,
    scope: config.scope,
    short_name: config.shortName,
    start_url:
      typeof config.startUrl === 'undefined' ? '/?utm_source=web_app_manifest' : config.startUrl,
    theme_color: config.themeColor,
    crossorigin: config.crossorigin,
  };

  // Avoid defining an empty array, or setting prefer_related_applications to true when no applications are defined.
  if (Array.isArray(config.relatedApplications) && config.relatedApplications.length > 0) {
    manifest.related_applications = config.relatedApplications;
    manifest.prefer_related_applications = config.preferRelatedApplications;
  }

  return manifest;
}
