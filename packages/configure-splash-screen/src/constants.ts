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

/**
 * These arguments have to be provided by the user or omitted if possible.
 */
export interface Parameters {
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
