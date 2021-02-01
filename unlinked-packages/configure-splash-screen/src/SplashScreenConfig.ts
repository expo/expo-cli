import { SplashScreenImageResizeModeType, SplashScreenStatusBarStyleType } from './constants';

export type Color = [number, number, number, number];

/**
 * iOS SplashScreen config.
 */
export type IosSplashScreenConfig = {
  backgroundColor: Color;

  image?: string;
  imageResizeMode?: SplashScreenImageResizeModeType;

  statusBar?: {
    hidden?: boolean;
    style?: SplashScreenStatusBarStyleType;
  };

  darkMode?: {
    backgroundColor?: Color;
    image?: string;
  };
};

/**
 * Android SplashScreen config.
 */
export type AndroidSplashScreenConfig = {
  backgroundColor: Color;

  image?: string;
  imageResizeMode?: SplashScreenImageResizeModeType;

  statusBar?: {
    hidden?: boolean;
    style?: SplashScreenStatusBarStyleType;
    translucent?: boolean;
    backgroundColor?: Color;
  };

  darkMode?: {
    backgroundColor?: Color;
    image?: string;
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

  image?: string;
  imageResizeMode?: string;

  statusBar?: {
    hidden?: boolean;
    style?: string;
  };

  darkMode?: {
    backgroundColor?: string;
    image?: string;
  };
};

/**
 * The very same as `IosSplashScreenConfig`, but JSON-friendly (values for each property are JavaScript built-in types).
 */
export type AndroidSplashScreenConfigJSON = {
  backgroundColor: string;

  image?: string;
  imageResizeMode?: string;

  statusBar?: {
    hidden?: boolean;
    style?: string;
    translucent?: boolean;
    backgroundColor?: string;
  };

  darkMode?: {
    backgroundColor?: string;
    image?: string;
    statusBar?: {
      style?: string;
      backgroundColor?: string;
    };
  };
};
