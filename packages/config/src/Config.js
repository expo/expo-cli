/**
 * @flow
 */

import fs from 'fs-extra';
import path from 'path';
import JsonFile from '@expo/json-file';
import resolveFrom from 'resolve-from';
import slug from 'slugify';
import findWorkspaceRoot from 'find-yarn-workspace-root';

let hasWarnedAboutExpJson = false;

const EXP_JSON_FILE_NAME = 'exp.json';
const APP_JSON_FILE_NAME = 'app.json';

// To work with the iPhone X "notch" add `viewport-fit=cover` to the `viewport` meta tag.
const DEFAULT_VIEWPORT = 'width=device-width,initial-scale=1,minimum-scale=1,viewport-fit=cover';
// Use root to work better with create-react-app
const DEFAULT_ROOT_ID = `root`;
const DEFAULT_LANGUAGE_ISO_CODE = `en`;
const DEFAULT_NO_JS_MESSAGE = `Oh no! It looks like JavaScript is not enabled in your browser.`;
const DEFAULT_NAME = 'Expo App';
const DEFAULT_THEME_COLOR = '#4630EB';
const DEFAULT_DESCRIPTION = 'A Neat Expo App';
const DEFAULT_BACKGROUND_COLOR = '#ffffff';
const DEFAULT_START_URL = '.';
const DEFAULT_DISPLAY = 'fullscreen';
const DEFAULT_STATUS_BAR = 'default';
const DEFAULT_LANG_DIR = 'auto';
const DEFAULT_ORIENTATION = 'any';
const ICON_SIZES = [96, 128, 192, 256, 384, 512];
const MAX_SHORT_NAME_LENGTH = 12;
const DEFAULT_PREFER_RELATED_APPLICATIONS = true;

export async function addPlatform(
  projectRoot: string,
  platform: 'ios' | 'android' | 'web'
): Promise<{ exp: ?Object, pkg: ?Object, rootConfig: ?Object }> {
  const { exp } = await readConfigJsonAsync(projectRoot);

  let currentPlatforms = [];
  if (Array.isArray(exp.platforms) && exp.platforms.length) {
    currentPlatforms = exp.platforms;
  }
  if (currentPlatforms.includes(platform)) {
    return;
  }

  return await writeConfigJsonAsync(projectRoot, { platforms: [...currentPlatforms, platform] });
}

export function isUsingYarn(projectRoot: string): boolean {
  const workspaceRoot = findWorkspaceRoot(projectRoot);
  if (workspaceRoot) {
    return fs.existsSync(path.join(workspaceRoot, 'yarn.lock'));
  } else {
    return fs.existsSync(path.join(projectRoot, 'yarn.lock'));
  }
}

export async function fileExistsAsync(file: string): Promise<boolean> {
  try {
    return (await fs.stat(file)).isFile();
  } catch (e) {
    return false;
  }
}

export function fileExists(file: string): boolean {
  try {
    return fs.statSync(file).isFile();
  } catch (e) {
    return false;
  }
}

export function resolveModule(request, projectRoot, exp) {
  const fromDir = exp.nodeModulesPath ? exp.nodeModulesPath : projectRoot;
  return resolveFrom(fromDir, request);
}

async function _findConfigPathAsync(projectRoot: string) {
  const appJson = path.join(projectRoot, APP_JSON_FILE_NAME);
  const expJson = path.join(projectRoot, EXP_JSON_FILE_NAME);
  if (await fileExistsAsync(appJson)) {
    return appJson;
  } else if (await fileExistsAsync(expJson)) {
    return expJson;
  } else {
    return appJson;
  }
}

function _findConfigPath(projectRoot: string) {
  const appJson = path.join(projectRoot, APP_JSON_FILE_NAME);
  const expJson = path.join(projectRoot, EXP_JSON_FILE_NAME);
  if (fileExists(appJson)) {
    return appJson;
  } else if (fileExists(expJson)) {
    return expJson;
  } else {
    return appJson;
  }
}

export async function findConfigFileAsync(
  projectRoot: string
): Promise<{ configPath: string, configName: string, configNamespace: ?string }> {
  let configPath;
  if (customConfigPaths[projectRoot]) {
    configPath = customConfigPaths[projectRoot];
  } else {
    configPath = await _findConfigPathAsync(projectRoot);
  }
  return getConfigPaths(configPath);
}

export function findConfigFile(
  projectRoot: string
): Promise<{ configPath: string, configName: string, configNamespace: ?string }> {
  let configPath;
  if (customConfigPaths[projectRoot]) {
    configPath = customConfigPaths[projectRoot];
  } else {
    configPath = _findConfigPath(projectRoot);
  }
  return getConfigPaths(configPath);
}

function getConfigPaths(configPath: string) {
  const configName = path.basename(configPath);
  const configNamespace = configName !== EXP_JSON_FILE_NAME ? 'expo' : null;

  guardConfigName(configName);

  return { configPath, configName, configNamespace };
}

function guardConfigName(configName: string) {
  if (configName === EXP_JSON_FILE_NAME && !hasWarnedAboutExpJson) {
    hasWarnedAboutExpJson = true;
    throw new Error(`configuration using ${EXP_JSON_FILE_NAME} is deprecated.
    Please move your configuration from ${EXP_JSON_FILE_NAME} to ${APP_JSON_FILE_NAME}.
    Example ${APP_JSON_FILE_NAME}:
    {
      "expo": {
        (JSON contents from ${EXP_JSON_FILE_NAME})
      }
    }`);
  }
}

export async function configFilenameAsync(projectRoot: string): Promise<string> {
  return (await findConfigFileAsync(projectRoot)).configName;
}

export function configFilename(projectRoot: string): string {
  return findConfigFile(projectRoot).configName;
}

export async function readExpRcAsync(projectRoot: string): Promise<any> {
  const expRcPath = path.join(projectRoot, '.exprc');

  if (!fs.existsSync(expRcPath)) {
    return {};
  }

  try {
    return await JsonFile.readAsync(expRcPath, { json5: true });
  } catch (e) {
    throw new Error(`Failed to parse JSON file: ${e.toString()}`);
  }
}

let customConfigPaths = {};

export function setCustomConfigPath(projectRoot: string, configPath: string): void {
  customConfigPaths[projectRoot] = configPath;
}

export function createEnvironmentConstants(appManifest, pwaManifestLocation) {
  let web;
  try {
    web = require(pwaManifestLocation);
  } catch (e) {
    web = {};
  }

  return {
    /**
     * Omit app.json properties that get removed during the native turtle build
     *
     * `facebookScheme`
     * `facebookAppId`
     * `facebookDisplayName`
     */
    name: appManifest.displayName || appManifest.name,
    description: appManifest.description,
    slug: appManifest.slug,
    sdkVersion: appManifest.sdkVersion,
    version: appManifest.version,
    githubUrl: appManifest.githubUrl,
    orientation: appManifest.orientation,
    primaryColor: appManifest.primaryColor,
    privacy: appManifest.privacy,
    icon: appManifest.icon,
    scheme: appManifest.scheme,
    notification: appManifest.notification,
    splash: appManifest.splash,
    androidShowExponentNotificationInShellApp:
      appManifest.androidShowExponentNotificationInShellApp,
    web,
  };
}

function sanitizePublicPath(publicPath) {
  if (typeof publicPath !== 'string' || !publicPath.length) {
    return '/';
  }

  if (publicPath.endsWith('/')) {
    return publicPath;
  }
  return publicPath + '/';
}

export function getConfigForPWA(projectRoot: string, getAbsolutePath: Function, options: Object) {
  const config = readConfigJson(projectRoot);
  return ensurePWAConfig(config, getAbsolutePath, options);
}

export function getNameForAppJSON(appJSON: Object) {
  const appManifest = appJSON.expo || appJSON;
  const { web = {} } = appManifest;
  // rn-cli apps use a displayName value as well.
  const name = appJSON.displayName || appManifest.displayName || appManifest.name || DEFAULT_NAME;
  const webName = web.name || name;
  return {
    name,
    webName,
  };
}

function applyWebDefaults(appJSON: Object) {
  // For RN CLI support
  const appManifest = appJSON.expo || appJSON;
  const { web: webManifest = {}, splash = {} } = appManifest;
  const { build: webBuild = {}, webDangerous = {} } = webManifest;

  // rn-cli apps use a displayName value as well.
  const { name: appName, webName } = getNameForAppJSON(appJSON);

  const languageISOCode = webManifest.lang || DEFAULT_LANGUAGE_ISO_CODE;
  const noJavaScriptMessage = webDangerous.noJavaScriptMessage || DEFAULT_NO_JS_MESSAGE;
  const rootId = webBuild.rootId || DEFAULT_ROOT_ID;
  const publicPath = sanitizePublicPath(webManifest.publicPath);
  const primaryColor = appManifest.primaryColor || DEFAULT_THEME_COLOR;
  const description = appManifest.description || DEFAULT_DESCRIPTION;
  // The theme_color sets the color of the tool bar, and may be reflected in the app's preview in task switchers.
  const webThemeColor = webManifest.themeColor || primaryColor;
  const dir = webManifest.dir || DEFAULT_LANG_DIR;
  const shortName = webManifest.shortName || webName;
  const display = webManifest.display || DEFAULT_DISPLAY;
  const startUrl = webManifest.startUrl || DEFAULT_START_URL;
  const webViewport = webDangerous.viewport || DEFAULT_VIEWPORT;
  const { scope, crossorigin } = webManifest;
  const barStyle = webManifest.barStyle || DEFAULT_STATUS_BAR;

  let webOrientation = webManifest.orientation || appManifest.orientation;
  if (webOrientation && typeof orientation === 'string') {
    webOrientation = webOrientation.toLowerCase();
    // Convert expo value to PWA value
    if (webOrientation === 'default') {
      webOrientation = DEFAULT_ORIENTATION;
    }
  } else {
    webOrientation = DEFAULT_ORIENTATION;
  }

  /**
   * **Splash screen background color**
   * `https://developers.google.com/web/fundamentals/web-app-manifest/#splash-screen`
   * The background_color should be the same color as the load page,
   * to provide a smooth transition from the splash screen to your app.
   */
  const backgroundColor =
    webManifest.backgroundColor || splash.backgroundColor || DEFAULT_BACKGROUND_COLOR; // No default background color

  /**
   * https://developer.mozilla.org/en-US/docs/Web/Manifest#prefer_related_applications
   * Specifies a boolean value that hints for the user agent to indicate
   * to the user that the specified native applications (see below) are recommended over the website.
   * This should only be used if the related native apps really do offer something that the website can't... like Expo ;)
   */

  const preferRelatedApplications =
    webManifest.preferRelatedApplications || DEFAULT_PREFER_RELATED_APPLICATIONS;

  const relatedApplications = inferWebRelatedApplicationsFromConfig(appManifest);

  // Validate short name
  if (shortName.length > MAX_SHORT_NAME_LENGTH) {
    if (webManifest.shortName) {
      console.warn(
        `web.shortName should be 12 characters or less, otherwise it'll be curtailed on the mobile device homepage.`
      );
    } else {
      console.warn(
        `name should be 12 characters or less, otherwise it'll be curtailed on the mobile device homepage. You should define web.shortName in your ${APP_JSON_FILE_NAME} as a string that is ${MAX_SHORT_NAME_LENGTH} or less characters.`
      );
    }
  }

  return {
    ...appManifest,
    name: appName,
    description,
    primaryColor,
    web: {
      ...webManifest,
      build: {
        ...webBuild,
        rootId,
        publicPath,
      },
      dangerous: {
        ...webDangerous,
        noJavaScriptMessage,
        viewport: webViewport,
      },
      scope,
      crossorigin,
      description,
      preferRelatedApplications,
      relatedApplications,
      startUrl,
      shortName,
      display,
      orientation: webOrientation,
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
function inferWebRelatedApplicationsFromConfig({ web = {}, ios = {}, android = {} }: Object) {
  const relatedApplications = web.relatedApplications || [];

  const { bundleIdentifier, appStoreUrl } = ios;
  if (bundleIdentifier) {
    const PLATFORM_ITUNES = 'itunes';
    let iosApp = relatedApplications.some(({ platform }) => platform === PLATFORM_ITUNES);
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
      ({ platform }) => platform === PLATFORM_PLAY
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

function inferWebHomescreenIcons(config: Object, getAbsolutePath: Function, options: Object) {
  if (Array.isArray(config.web.icons)) {
    return config.web.icons;
  }
  let icons = [];
  let icon;
  if (config.web.icon || config.icon) {
    icon = getAbsolutePath(config.web.icon || config.icon);
  } else {
    // Use template icon
    icon = options.templateIcon;
  }
  icons.push({ src: icon, size: ICON_SIZES });
  const iOSIcon = config.icon || config.ios.icon;
  if (iOSIcon) {
    const iOSIconPath = getAbsolutePath(iOSIcon);
    icons.push({
      ios: true,
      size: 1024,
      src: iOSIconPath,
    });
  }
  return icons;
}

function inferWebStartupImages(config: Object, getAbsolutePath: Function, options: Object) {
  if (Array.isArray(config.web.startupImages)) {
    return config.web.startupImages;
  }

  const { splash: iOSSplash = {} } = config.ios;
  const { splash: webSplash = {} } = config.web;
  let startupImages = [];

  let splashImageSource;
  if (webSplash.image || iOSSplash.image || config.splash.image) {
    splashImageSource = getAbsolutePath(webSplash.image || iOSSplash.image || config.splash.image);
    startupImages.push({
      src: splashImageSource,
      supportsTablet: config.ios.supportsTablet,
      orientation: config.web.orientation,
      destination: `assets/splash`,
    });
  }
  return startupImages;
}

export function ensurePWAConfig(appJSON: Object, getAbsolutePath: Function, options: Object) {
  const config = applyWebDefaults(appJSON);
  config.web.icons = inferWebHomescreenIcons(config, getAbsolutePath, options);
  config.web.startupImages = inferWebStartupImages(config, getAbsolutePath, options);
  return config;
}

export function readConfigJson(projectRoot: string) {
  const { configPath, configNamespace } = findConfigFile(projectRoot);

  let exp;
  let rootConfig;

  exp = require(configPath);

  if (configNamespace) {
    // if we're not using exp.json, then we've stashed everything under an expo key
    rootConfig = exp;
    exp = exp[configNamespace];
  }

  if (!rootConfig) {
    throw new Error('app.json could not be found at: ' + configPath);
  }

  return exp;
}

export async function readConfigJsonAsync(
  projectRoot: string
): Promise<{ exp?: Object, pkg?: Object, rootConfig?: Object }> {
  let exp;
  let pkg;
  let rootConfig;

  const { configPath, configName, configNamespace } = await findConfigFileAsync(projectRoot);

  try {
    exp = await JsonFile.readAsync(configPath, { json5: true });

    if (configNamespace) {
      // if we're not using exp.json, then we've stashed everything under an expo key
      rootConfig = exp;
      exp = exp[configNamespace];
    }
  } catch (e) {
    if (e.code === 'ENOENT') {
      // config missing. might be in package.json
    } else if (e.isJsonFileError) {
      throw e;
    }
  }

  try {
    const packageJsonPath =
      exp && exp.nodeModulesPath
        ? path.join(path.resolve(projectRoot, exp.nodeModulesPath), 'package.json')
        : path.join(projectRoot, 'package.json');
    pkg = await JsonFile.readAsync(packageJsonPath);
  } catch (e) {
    if (e.isJsonFileError) {
      throw e;
    }

    // pkg missing
  }

  // Easiest bail-out: package.json is missing
  if (!pkg) {
    throw new Error(`Can't find package.json`);
  }

  // Grab our exp config from package.json (legacy) or exp.json
  if (!exp && pkg.exp) {
    exp = pkg.exp;
    throw new Error(`Move your "exp" config from package.json to ${APP_JSON_FILE_NAME}.`);
  } else if (!exp && !pkg.exp) {
    throw new Error(`Missing ${configName}. See https://docs.expo.io/`);
  }

  // fill any required fields we might care about

  // TODO(adam) decide if there are other fields we want to provide defaults for

  if (exp && !exp.name) {
    exp.name = pkg.name;
  }

  if (exp && !exp.slug) {
    exp.slug = slug(exp.name.toLowerCase());
  }

  if (exp && !exp.version) {
    exp.version = pkg.version;
  }

  if (exp && !exp.platforms) {
    exp.platforms = ['android', 'ios', 'web'];
  }

  if (exp.nodeModulesPath) {
    exp.nodeModulesPath = path.resolve(projectRoot, exp.nodeModulesPath);
  }

  return { exp, pkg, rootConfig };
}

export async function writeConfigJsonAsync(
  projectRoot: string,
  options: Object
): Promise<{ exp: ?Object, pkg: ?Object, rootConfig: ?Object }> {
  const { configName, configPath, configNamespace } = await findConfigFileAsync(projectRoot);
  let { exp, pkg, rootConfig } = await readConfigJsonAsync(projectRoot);
  let config = rootConfig || {};

  if (!exp) {
    throw new Error(`Couldn't read ${configName}`);
  }
  if (!pkg) {
    throw new Error(`Couldn't read package.json`);
  }

  exp = {
    ...exp,
    ...options,
  };

  if (configNamespace) {
    config[configNamespace] = exp;
  } else {
    config = exp;
  }

  await JsonFile.writeAsync(configPath, config, { json5: false });

  return {
    exp,
    pkg,
    rootConfig,
  };
}
