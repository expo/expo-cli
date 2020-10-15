import {
  IosSplashScreenConfigJSON,
  IosSplashScreenConfig,
  AndroidSplashScreenConfigJSON,
  AndroidSplashScreenConfig,
} from '../SplashScreenConfig';
export { validateEnumValue } from './utils';
/**
 * Validates given iOS configuration and converts it to it's semantically ready equivalent.
 * Ensures following generic config semantic requirements are met:
 * - `config.backgroundColor` is a valid css-formatted color,
 * - `config.imagePath` is pointing to a valid .png file,
 * - `config.imageResizeMode`
 *   - is provided only if `config.imagePath` is provided as well
 *   - and it's a recognizable value (one of `SplashScreenResizeMode`)
 *   - and its value isn't `SplashScreenImageResizeMode.NATIVE`
 *
 * - `config.statusBar.hidden` might exists
 * - `config.statusBar.style` is a recognizable value (one of `SplashScreenStatusBarStyle`),
 *
 * - `config.darkMode.backgroundColor` is a valid css-formatted color,
 * - `config.darkMode.imagePath`
 *   - is provided only if `config.darkMode.backgroundColor` is provided as well
 *   - and it's pointing to a valid .png file,
 */
export declare function validateIosConfig(
  config: IosSplashScreenConfigJSON
): Promise<IosSplashScreenConfig>;
/**
 * Validates given Android configuration and converts it to it's semantically ready equivalent.
 *
 * Ensures following generic config semantic requirements are met:
 * - `config.backgroundColor` is a valid css-formatted color,
 * - `config.imagePath` is pointing to a valid .png file,
 * - `config.imageResizeMode`
 *   - is provided only if `config.imagePath` is provided as well
 *   - and it's a recognizable value (one of `SplashScreenResizeMode`)
 *
 * - `config.statusBar.hidden` might exists,
 * - `config.statusBar.style` is a recognizable value (one of `SplashScreenStatusBarStyle`),
 * - `config.statusBar.translucent` might exist,
 * - `config.statusBar.backgroundColor` is a valid css-formatted color,
 *
 * - `config.darkMode.backgroundColor` is a valid css-formatted color,
 * - `config.darkMode.imagePath`
 *   - is provided only if `config.darkMode.backgroundColor` is provided as well
 *   - and it's pointing to a valid .png file,
 *
 * - `config.darkMode.statusBar.style`
 *    - is provided only if `config.darkMode.backgroundColor` is provided as well
 *    - and `config.statusBar.style` is provided as well
 *    - and it's a recognizable value (one of `SplashScreenStatusBarStyle`),
 * - `config.darkMode.statusBar.backgroundColor`
 *    - is provided only if `config.darkMode.backgroundColor` is provided as well
 *    - and `config.statusBar.backgroundColor` is provided as well
 *    - and it's a valid css-formatted color,
 */
export declare function validateAndroidConfig(
  config: AndroidSplashScreenConfigJSON
): Promise<AndroidSplashScreenConfig>;
