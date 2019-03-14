const WebpackPwaManifest = require('webpack-pwa-manifest');

const MAX_SHORT_NAME_LENGTH = 12;
const DEFAULT_COLOR = '#4630EB';
const DEFAULT_START_URL = '.';
const DEFAULT_DISPLAY = 'fullscreen';
const DEFAULT_STATUS_BAR = 'default';
const DEFAULT_LANG_DIR = 'auto';
function getManifests(location) {
  const nativeAppManifest = require(location);
  if (!nativeAppManifest) {
    throw new Error('app.json could not be found at: ' + location);
  }
  const { expo = {} } = nativeAppManifest;
  return {
    expo,
    web: expo.web || {},
    splash: expo.splash || {},
    ios: expo.ios || {},
    android: expo.android || {},
  };
}

// CSS can target this with https://developer.mozilla.org/en-US/docs/Web/CSS/@media/display-mode
const VALID_DISPLAY_TYPES = [
  /**
   * Opens the web application without any browser UI and takes up the entirety of the available display area.
   * Fallback to: `standalone`
   */
  'fullscreen',
  /**
   * Opens the web app to look and feel like a standalone native app. The app runs in its own window, separate from the browser, and hides standard browser UI elements like the URL bar, etc.
   * Fallback to: `minimal-ui`
   */
  'standalone',
  /**
   * This mode is similar to fullscreen, but provides the user with some means to access a minimal set of UI elements for controlling navigation (i.e., back, forward, reload, etc).
   * > Note: Only supported by Chrome on mobile.
   * Fallback to: `browser`
   */
  'minimal-ui',
  /**
   * A standard browser experience.
   */
  'browser',
];

const VALID_ICON_PURPOSE = [
  /**
   * A user agent can present this icon where space constraints and/or color requirements differ from those of the application icon.
   */
  'badge',
  /**
   * The image is designed with icon masks and safe zone in mind, such that any part of the image that is outside the safe zone can safely be ignored and masked away by the user agent.
   */
  'maskable',
  /**
   * The user agent is free to display the icon in any context (this is the default value).
   */
  'any',
];

const VALID_MULTI_PURPOSE_PLATFORMS = [
  'play', // android
  'itunes', // ios
  'windows', // windows
];

function isObject(item) {
  return typeof item === 'object' && !Array.isArray(item) && item !== null;
}

// function enforceIcon(icon) {
//     if (!icon || !isObject(icon) || typeof icon.src !== 'string') {return null;}
//     let warnings = [];
//     const {
//         /**
//          * The platform member represents the platform to which a containing object applies.
//          * List of known platforms: https://github.com/w3c/manifest/wiki/Platforms
//          */
//         platform,
//         // A string containing space-separated image dimensions.
//         sizes,
//         // The path to the image file. If src is a relative URL, the base URL will be the URL of the manifest.
//         src,
//         /**
//          * A hint as to the media type of the image.
//          * The purpose of this member is to allow a user agent to quickly ignore images of media types it does not support.
//          */
//         type,
//         /**
//          * Defines the purpose of the image, for example that the image is
//          * intended to serve some special purpose in the context of the
//          * host OS (i.e., for better integration).
//          * `https://w3c.github.io/manifest/#purpose-member`
//          *
//          * Must be an **unordered set of unique space-separated tokens**
//          */
//         purpose,

//         // TODO: Bacon: Should we allow extra props?
//         ...props,
//     } = icon;

//     let strictPurpose = purpose;
//     if (typeof purpose === 'string' && purpose.length) {
//         const purposes = [...(new Set(purpose.toLowerCase().split(' ')))];
//         const filteredPurposes = purposes.filter(purpose => {
//            if (VALID_ICON_PURPOSE.includes(purpose)) {
//                return true;
//            }
//            warnings.push(`icon.purpose: ${purpose} is not a valid icon purpose`);
//            return false;
//         });
//         strictPurpose = filteredPurposes.join(' ');
//     }

//     if (typeof platform === 'string' && platform.length && !VALID_MULTI_PURPOSE_PLATFORMS.includes(platform.toLowerCase())) {
//         warnings.push(`icon.platform: ${platform} is not one of the known platform types: ${VALID_MULTI_PURPOSE_PLATFORMS.join(', ')}`)
//     }

//     let outputType = type;
//     const isTypeDefined = typeof type === 'string' && type.length;
//     if (!isTypeDefined) {
//         let ext = src.substr(src.lastIndexOf('.') + 1).toLowerCase();
//         // TODO: Bacon: x-icon is only valid when platform is windows?
//         // https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types#Image_types
//         if (['jpeg', 'png', 'gif', 'webp', 'svg+xml', 'x-icon'].includes(ext)) {
//             outputType = `image/${ext}`;
//         } else if (ext === 'jpg') {
//             outputType = `image/jpeg`;
//         }
//     }

//     return {
//         warnings,
//         icon: {
//             platform,
//             sizes,
//             src,
//             type: outputType,
//             purpose: strictPurpose,
//             ...props
//         }
//     }
// }

// https://developer.mozilla.org/en-US/docs/Web/Manifest#orientation
const VALID_ORIENTATIONS = [
  'any',
  'natural',
  'landscape',
  'landscape-primary',
  'landscape-secondary',
  'portrait',
  'portrait-primary',
  'portrait-secondary',
  'omit',
];

// https://developers.google.com/web/fundamentals/web-app-manifest/#icons
const REQUIRED_ICON_SIZES = [192, 512];

const ICON_SIZES = [96, 128, 192, 256, 384, 512];

/**
 * Generate a `manifest.json` for your PWA based on the `app.json`.
 * This plugin must be **after HtmlWebpackPlugin**.
 *
 * To test PWAs in chrome visit `chrome://flags#enable-desktop-pwas`
 */
function createPWAManifestJSONFromAppJSON(locations, options) {
  const { noWarnings, strict } = options;
  // TODO: Bacon: `strict: true` Enforce the `add to home screen` rules: https://developers.google.com/web/fundamentals/app-install-banners/
  function warn(...props) {
    if (noWarnings) {
      return;
    }
    console.warn('PWA: ', ...props);
  }
  function invariant(should, message) {
    if (!should) warn(message);
  }

  const { expo, web, splash, ios, android } = getManifests(locations.appJson);

  // Check for web values first.

  const name = web.name || expo.name;
  const shortName = web.shortName || web.short_name || name;
  const description = web.description || expo.description;
  /**
   * **Splash screen background color**
   * `https://developers.google.com/web/fundamentals/web-app-manifest/#splash-screen`
   * The background_color should be the same color as the load page,
   * to provide a smooth transition from the splash screen to your app.
   */

  const backgroundColor = web.backgroundColor || web.background_color || splash.backgroundColor; // No default background color

  // The theme_color sets the color of the tool bar, and may be reflected in the app's preview in task switchers.
  // TODO: Bacon: Ensure this is covered by `WebpackPwaManifest`: the theme_color should match the meta theme color specified in your document head.
  const themeColor = web.themeColor || web.theme_color || expo.primaryColor || DEFAULT_COLOR;
  // TODO: Bacon: startUrl or startURL ?
  const startUrl = web.startUrl || web.start_url || DEFAULT_START_URL;
  // validation: https://github.com/arthurbergmz/webpack-pwa-manifest/blob/ce46542adef3b91fd65221c586c6e934a3b6a272/src/validators/presets.js#L10
  const display = web.display || DEFAULT_DISPLAY;

  let orientation = web.orientation || expo.orientation;
  if (orientation && typeof orientation === 'string') {
    orientation = orientation.toLowerCase();
  } else {
    orientation = 'natural';
  }

  // If you don't include a scope in your manifest, then the default implied scope is the directory that your web app manifest is served from.
  const scope = web.scope;

  const barStyle =
    web.barStyle || web['apple-mobile-web-app-status-bar-style'] || DEFAULT_STATUS_BAR;
  /**
   * https://developer.mozilla.org/en-US/docs/Web/Manifest#related_applications
   * An array of native applications that are installable by, or accessible to, the underlying platform
   * for example, a native Android application obtainable through the Google Play Store.
   * Such applications are intended to be alternatives to the
   * website that provides similar/equivalent functionality — like the native app version of the website.
   */
  let relatedApplications = web.relatedApplications || web.related_applications || [];
  /**
   * If the manifest needs credentials to fetch you have to add the crossorigin attribute even if the manifest file is in the same orgin of the current page.
   * null, `use-credentials` or `anonymous`
   * validation: https://github.com/arthurbergmz/webpack-pwa-manifest/blob/ce46542adef3b91fd65221c586c6e934a3b6a272/src/validators/presets.js#L13
   */
  const crossorigin = web.crossorigin || null;

  /**
   * https://developer.mozilla.org/en-US/docs/Web/Manifest#dir
   * `ltr`, `rtl`, `auto`
   * validation: https://github.com/arthurbergmz/webpack-pwa-manifest/blob/ce46542adef3b91fd65221c586c6e934a3b6a272/src/validators/presets.js#L4
   */
  const dir = web.dir || DEFAULT_LANG_DIR;

  /**
   * https://developer.mozilla.org/en-US/docs/Web/Manifest#prefer_related_applications
   * Specifies a boolean value that hints for the user agent to indicate
   * to the user that the specified native applications (see below) are recommended over the website.
   * This should only be used if the related native apps really do offer something that the website can't... like Expo ;)
   */
  const preferRelatedApplications =
    web.recommendNativeApp || web.preferRelatedApplications || web.prefer_related_applications;
  /**
   * Specifies the primary language for the values in the `name` and `short_name` members.
   * This value is a string containing a single language tag.
   * ex: `"en-US"`
   */
  // TODO: Bacon: sync with <html/> lang
  const lang = web.lang;

  // TODO: Bacon: validation doesn't handle platforms: https://github.com/arthurbergmz/webpack-pwa-manifest/blob/master/src/icons/index.js
  // TODO: Bacon: Maybe use android, and iOS icons.
  let icons = [];
  let icon;
  if (web.icon || expo.icon) {
    icon = locations.absolute(web.icon || expo.icon);
  } else {
    // Use template icon
    icon = locations.template.get('icon.png');
  }
  icons.push({ src: icon, size: ICON_SIZES });

  const iOSIcon = expo.icon || ios.icon;
  if (iOSIcon) {
    const iOSIconPath = locations.absolute(iOSIcon);
    icons.push({
      ios: true,
      size: 1024,
      src: iOSIconPath,
    });

    const { splash: iOSSplash = {} } = ios;
    let splashImageSource = iOSIconPath;
    if (iOSSplash.image || splash.image) {
      splashImageSource = locations.absolute(iOSSplash.image || splash.image);
    }
    icons.push({
      ios: 'startup',
      src: splashImageSource,
      size: ['640x1136', '750x1334', '768x1024'],
    });
  }

  // Validate short name
  if (shortName && shortName.length > MAX_SHORT_NAME_LENGTH) {
    let message;
    if (web.shortName) {
      warn(
        `web.shortName should be 12 characters or less, otherwise it'll be curtailed on the mobile device homepage.`
      );
    } else {
      warn(
        `name should be 12 characters or less, otherwise it'll be curtailed on the mobile device homepage. You should define web.shortName in your app.json as a string that is ${MAX_SHORT_NAME_LENGTH} or less characters.`
      );
    }
  }

  const EXPO_ORIENTATIONS = ['landscape', 'portrait'];
  if (!web.orientation && !EXPO_ORIENTATIONS.includes(orientation)) {
    warn(
      `orientation: ${orientation} is invalid. Expected one of: ${EXPO_ORIENTATIONS.join(
        ', '
      )}. For more control define your \`web.orientation\` as one of: ${VALID_ORIENTATIONS.join(
        ', '
      )}`
    );
  }

  if (strict && display && !['fullscreen', 'standalone', 'minimal-ui'].includes(display)) {
    warn(
      `web.display: ${display} is not a valid PWA display and will prevent the app install banner from being shown.`
    );
  }

  // if the user manually defines this as false, then don't infer native apps.
  if (preferRelatedApplications !== false) {
    const noRelatedApplicationsDefined =
      Array.isArray(relatedApplications) && !relatedApplications.length;

    if (noRelatedApplicationsDefined) {
      if (ios.bundleIdentifier) {
        const alreadyHasIOSApp = relatedApplications.some(app => app.platform === 'itunes');
        if (!alreadyHasIOSApp) {
          const iosApp = {
            platform: 'itunes',
            url: ios.appStoreUrl,
            id: ios.bundleIdentifier,
          };
          relatedApplications.push(iosApp);
        }
      }
      if (android.package) {
        const alreadyHasAndroidApp = relatedApplications.some(app => app.platform === 'play');
        if (!alreadyHasAndroidApp) {
          const androidUrl = android.playStoreUrl;
          if (!androidUrl && android.package) {
            androidUrl = `http://play.google.com/store/apps/details?id=${android.package}`;
          }
          const androidApp = {
            platform: 'play',
            url: androidUrl,
            id: android.package,
          };
          relatedApplications.push(androidApp);
        }
      }
    }
  }

  return new WebpackPwaManifest({
    background_color: backgroundColor,
    description: description,
    dir,
    display: display,
    filename: locations.production.manifest,
    includeDirectory: false,
    icons: icons,
    lang,
    name: name,
    orientation,
    prefer_related_applications: preferRelatedApplications,
    related_applications: relatedApplications,
    scope,
    short_name: shortName,
    start_url: startUrl,
    theme_color: themeColor,
    ios: {
      'apple-mobile-web-app-status-bar-style': barStyle,
    },
    crossorigin,
  });
}

module.exports = createPWAManifestJSONFromAppJSON;
