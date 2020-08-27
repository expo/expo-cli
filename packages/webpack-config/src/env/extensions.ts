import { getBareExtensions } from '@expo/config/paths';

/**
 * Get the platform specific platform extensions in the format that Webpack expects (with a dot prefix).
 *
 * @param platforms supported platforms in order of priority. ex: ios, android, web, native, electron, etc...
 * @category env
 */
export function getModuleFileExtensions(...platforms: string[]): string[] {
  // Webpack requires a `.` before each value
  return getBareExtensions(platforms).map(value => `.${value}`);
}

export function getNativeModuleFileExtensions(...platforms: string[]): string[] {
  // Webpack requires a `.` before each value
  // Disable modern when using `react-native`
  return getBareExtensions(platforms, { isReact: true, isTS: true, isModern: false }).map(
    value => `.${value}`
  );
}
