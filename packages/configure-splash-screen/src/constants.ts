import { ColorDescriptor } from 'color-string';

export enum ResizeMode {
  CONTAIN = 'contain',
  COVER = 'cover',
  NATIVE = 'native',
}

export enum Platform {
  ANDROID = 'android',
  IOS = 'ios',
  ALL = 'all',
}

export enum StatusBarStyle {
  DEFAULT = 'default',
  LIGHT_CONTENT = 'light-content',
  DARK_CONTENT = 'dark-content',
}

/**
 * These arguments have to be provided by the user or omitted if possible.
 */
export interface Arguments {
  backgroundColor: ColorDescriptor;
  /**
   * Absolute path
   */
  imagePath?: string;
  darkModeBackgroundColor?: ColorDescriptor;
  /**
   * Absolute path
   */
  darkModeImagePath?: string;
}

/**
 * These might be optionally provided by the user. There are default values for them.
 */
export interface StatusBarOptions {
  statusBarHidden: boolean;
  statusBarStyle: StatusBarStyle;
  darkModeStatusBarStyle?: StatusBarStyle;
}

/**
 * These might be optionally provided by the user. There are default values for them.
 * Android only
 */
export interface AndroidOnlyStatusBarOptions {
  statusBarTranslucent?: true;
  statusBarBackgroundColor?: ColorDescriptor;
  darkModeStatusBarBackgroundColor?: ColorDescriptor;
}
