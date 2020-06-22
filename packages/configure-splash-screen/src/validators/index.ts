import { SplashScreenImageResizeMode, SplashScreenStatusBarStyle } from '../constants';
import {
  IosSplashScreenJsonConfig,
  IosSplashScreenConfig,
  AndroidSplashScreenJsonConfig,
  AndroidSplashScreenConfig,
  GenericSplashScreenJsonConfig,
  GenericSplashScreenConfig,
} from '../types';
import FromJsonValidator from './FromJsonValidator';
import {
  validateColor,
  validateFileIsPng,
  ensurePropertyExists,
  generateValidateEnumValue,
} from './utils';

export { validateEnumValue } from './utils';

/**
 * Validates given configuration and converts it to it's semantically ready equivalent.
 *
 * Ensures following generic config semantic requirements are met:
 * - `config.backgroundColor` is a valid css-formatted color,
 * - `config.imagePath` is pointing to a valid .png file,
 * - `config.imageResizeMode`
 *   - is provided only if `config.imagePath` is provided as well
 *   - and it's a recognizable value (one of `SplashScreenResizeMode`)
 *
 * - `config.statusBar.hidden` might exists
 * - `config.statusBar.style` is a recognizable value (one of `SplashScreenStatusBarStyle`),
 *
 * - `config.darkMode.backgroundColor` is a valid css-formatted color,
 * - `config.darkMode.imagePath`
 *   - is provided only if `config.darkMode.backgroundColor` is provided as well
 *   - and it's pointing to a valid .png file,
 */
function genericSplashScreenConfigValidator() {
  const validator = new FromJsonValidator<
    GenericSplashScreenJsonConfig,
    GenericSplashScreenConfig
  >()
    .addRule(['backgroundColor'], validateColor)
    .addRule(['imagePath'], validateFileIsPng)
    .addRule(['imageResizeMode'], (value, config) => {
      ensurePropertyExists(config, ['imagePath']);
      return generateValidateEnumValue(SplashScreenImageResizeMode)(value);
    })
    .addRule(['statusBar', 'hidden'])
    .addRule(['statusBar', 'style'], generateValidateEnumValue(SplashScreenStatusBarStyle))
    .addRule(['darkMode', 'backgroundColor'], validateColor)
    .addRule(['darkMode', 'imagePath'], (value, config) => {
      ensurePropertyExists(config, ['darkMode', 'backgroundColor']);
      return validateFileIsPng(value);
    });
  return validator;
}

/**
 * Validates given iOS configuration and converts it to it's semantically ready equivalent.
 *
 * Additional or different iOS rules :
 * - `config.imageResizeMode`
 *   - is provided only if `config.imagePath` is provided as well
 *   - and it's a recognizable value (one of `SplashScreenResizeMode`)
 *   - and it's value isn't `SplashScreenImageResizeMode.NATIVE`
 */
export async function validateIosConfig(
  config: IosSplashScreenJsonConfig
): Promise<IosSplashScreenConfig> {
  const genericValidator = genericSplashScreenConfigValidator();
  const validator = new FromJsonValidator<IosSplashScreenJsonConfig, IosSplashScreenConfig>(
    genericValidator
  ).addRule(['imageResizeMode'], (value, config) => {
    ensurePropertyExists(config, ['imagePath']);
    const result = generateValidateEnumValue(SplashScreenImageResizeMode)(value);
    if (result === SplashScreenImageResizeMode.NATIVE) {
      const { NATIVE, ...availableValues } = SplashScreenImageResizeMode;
      throw new Error(
        `Invalid value '${value}'. This value is not supported on iOS platform. Available values on iOS platform are ${Object.values(
          availableValues
        )
          .map(v => `"${v}"`)
          .join(' | ')}.`
      );
    }
    return result;
  });
  const validateConfig = await validator.validate(config);
  return validateConfig;
}

/**
 * Validates given Android configuration and converts it to it's semantically ready equivalent.
 *
 * Additional or different Android rules regarding generic ones:
 * - `config.statusBar.translucent` might exist
 * - `config.statusBar.backgroundColor` is a valid css-formatted color,
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
export async function validateAndroidConfig(
  config: AndroidSplashScreenJsonConfig
): Promise<AndroidSplashScreenConfig> {
  const validator = new FromJsonValidator<AndroidSplashScreenJsonConfig, AndroidSplashScreenConfig>(
    genericSplashScreenConfigValidator()
  )
    .addRule(['statusBar', 'translucent'])
    .addRule(['statusBar', 'backgroundColor'], validateColor)
    .addRule(['darkMode', 'statusBar', 'style'], (value, config) => {
      ensurePropertyExists(config, ['darkMode', 'backgroundColor']);
      ensurePropertyExists(config, ['statusBar', 'style']);
      return generateValidateEnumValue(SplashScreenStatusBarStyle)(value);
    })
    .addRule(['darkMode', 'statusBar', 'backgroundColor'], (value, config) => {
      ensurePropertyExists(config, ['darkMode', 'backgroundColor']);
      ensurePropertyExists(config, ['statusBar', 'backgroundColor']);
      return validateColor(value);
    });

  const validateConfig = await validator.validate(config);

  return validateConfig;
}
