import PresetError from '../errors/PresetError';

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

// https://developers.google.com/web/fundamentals/web-app-manifest/#icons
const REQUIRED_ICON_SIZES = [192, 512];

const presets = {
  dir: ['ltr', 'rtl', 'auto'],
  orientation: [
    'any',
    'natural',
    'landscape',
    'landscape-primary',
    'landscape-secondary',
    'portrait',
    'portrait-primary',
    'portrait-secondary',
    'omit',
  ],
  display: VALID_DISPLAY_TYPES,
  crossorigin: ['anonymous', 'use-credentials'],
};

function hasPreset(key, value) {
  return presets[key].indexOf(value) >= 0;
}

export default function(config, ...properties) {
  if (!config) return;
  for (let property of properties) {
    let value = config[property];
    if (value && !hasPreset(property, value)) {
      throw new PresetError(property, value);
    }
  }
}
