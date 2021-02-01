export const SplashScreenImageResizeMode = {
  CONTAIN: 'contain',
  COVER: 'cover',
  NATIVE: 'native',
} as const;
export type SplashScreenImageResizeModeType = TypeFromConstObject<
  typeof SplashScreenImageResizeMode
>;

export const Platform = {
  ANDROID: 'android',
  IOS: 'ios',
  ALL: 'all',
} as const;
export type PlatformType = TypeFromConstObject<typeof Platform>;

export const SplashScreenStatusBarStyle = {
  DEFAULT: 'default',
  LIGHT_CONTENT: 'light-content',
  DARK_CONTENT: 'dark-content',
} as const;
export type SplashScreenStatusBarStyleType = TypeFromConstObject<typeof SplashScreenStatusBarStyle>;

type TypeFromConstObject<T extends object> = T[keyof T];
