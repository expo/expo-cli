export declare const SplashScreenImageResizeMode: {
  readonly CONTAIN: 'contain';
  readonly COVER: 'cover';
  readonly NATIVE: 'native';
};
export declare type SplashScreenImageResizeModeType = TypeFromConstObject<
  typeof SplashScreenImageResizeMode
>;
export declare const Platform: {
  readonly ANDROID: 'android';
  readonly IOS: 'ios';
  readonly ALL: 'all';
};
export declare type PlatformType = TypeFromConstObject<typeof Platform>;
export declare const SplashScreenStatusBarStyle: {
  readonly DEFAULT: 'default';
  readonly LIGHT_CONTENT: 'light-content';
  readonly DARK_CONTENT: 'dark-content';
};
export declare type SplashScreenStatusBarStyleType = TypeFromConstObject<
  typeof SplashScreenStatusBarStyle
>;
declare type TypeFromConstObject<T extends object> = T[keyof T];
export {};
