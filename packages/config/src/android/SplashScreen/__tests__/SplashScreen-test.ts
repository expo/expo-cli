import { ExpoConfig } from '@expo/config-types';

const config: ExpoConfig = {
  name: 'foo',
  slug: 'foo',
  androidStatusBar: {
    /**
     * Configures the status bar icons to have a light or dark color. Valid values: `light-content`, `dark-content`. Defaults to `dark-content`
     */
    barStyle: 'light-content', //| 'dark-content';
    /**
     * Specifies the background color of the status bar. Defaults to `#00000000` (transparent) for `dark-content` bar style and `#00000088` (semi-transparent black) for `light-content` bar style
     */
    backgroundColor: '#00000088',
    /**
     * Instructs the system whether the status bar should be visible or not. Defaults to `false`
     */
    hidden: false,
    /**
     * Specifies whether the status bar should be translucent (whether it should be treated as a block element that will take up space on the device's screen and limit space available for the rest of your app to be rendered, or be treated as an element with `'position = absolute'` that is rendered above your app's content). Defaults to `true` (default iOS behavior, the iOS status bar cannot be set translucent by the system)
     */
    translucent: true,
  },
};
