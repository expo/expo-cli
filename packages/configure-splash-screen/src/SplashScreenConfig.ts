import { Color } from 'color-string';

import { SplashScreenImageResizeModeType, SplashScreenStatusBarStyleType } from './constants';

/**
 * iOS SplashScreen config.
 */
export type IosSplashScreenConfig = {
  backgroundColor: Color;

  imagePath?: string;
  imageResizeMode?: SplashScreenImageResizeModeType;

  statusBar?: {
    hidden?: boolean;
    style?: SplashScreenStatusBarStyleType;
  };

  darkMode?: {
    backgroundColor?: Color;
    imagePath?: string;
  };
};

/**
 * Android SplashScreen config.
 */
export type AndroidSplashScreenConfig = {
  backgroundColor: Color;

  imagePath?: string;
  imageResizeMode?: SplashScreenImageResizeModeType;

  statusBar?: {
    hidden?: boolean;
    style?: SplashScreenStatusBarStyleType;
    translucent?: boolean;
    backgroundColor?: Color;
  };

  darkMode?: {
    backgroundColor?: Color;
    imagePath?: string;
    statusBar?: {
      style?: SplashScreenStatusBarStyleType;
      backgroundColor?: Color;
    };
  };
};

/**
 * The very same as `IosSplashScreenConfig`, but JSON-friendly (values for each property are JavaScript built-in types).
 */
export type IosSplashScreenConfigJSON = {
  backgroundColor: string;

  imagePath?: string;
  imageResizeMode?: string;

  statusBar?: {
    hidden?: boolean;
    style?: string;
  };

  darkMode?: {
    backgroundColor?: string;
    imagePath?: string;
  };
};

/**
 * The very same as `IosSplashScreenConfig`, but JSON-friendly (values for each property are JavaScript built-in types).
 */
export type AndroidSplashScreenConfigJSON = {
  backgroundColor: string;

  imagePath?: string;
  imageResizeMode?: string;

  statusBar?: {
    hidden?: boolean;
    style?: string;
    translucent?: boolean;
    backgroundColor?: string;
  };

  darkMode?: {
    backgroundColor?: string;
    imagePath?: string;
    statusBar?: {
      style?: string;
      backgroundColor?: string;
    };
  };
};
