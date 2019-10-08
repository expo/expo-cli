import { PresetError } from '../Errors';

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

function hasPreset(key: string, value: any): boolean {
  // @ts-ignore
  return presets[key].includes(value);
}

export default function(config: any, ...properties: string[]) {
  if (!config) return;
  for (let property of properties) {
    let value = config[property];
    if (value && !hasPreset(property, value)) {
      throw new PresetError(property, value);
    }
  }
}
