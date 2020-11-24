'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.validateAndroidConfig = exports.validateIosConfig = exports.validateEnumValue = void 0;
const constants_1 = require('../constants');
const FromJsonValidator_1 = __importDefault(require('./FromJsonValidator'));
const utils_1 = require('./utils');
var utils_2 = require('./utils');
Object.defineProperty(exports, 'validateEnumValue', {
  enumerable: true,
  get: function () {
    return utils_2.validateEnumValue;
  },
});
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
async function validateIosConfig(config) {
  const validator = new FromJsonValidator_1.default()
    .addRule(['backgroundColor'], utils_1.validateColor)
    .addRule(['image'], utils_1.validateFileIsPng)
    .addRule(['imageResizeMode'], (value, config) => {
      utils_1.ensurePropertyExists(config, ['image']);
      const result = utils_1.generateValidateEnumValue(constants_1.SplashScreenImageResizeMode)(
        value
      );
      if (result === constants_1.SplashScreenImageResizeMode.NATIVE) {
        const { NATIVE, ...availableValues } = constants_1.SplashScreenImageResizeMode;
        throw new Error(
          `Invalid value '${value}'. This value is not supported on iOS platform. Available values on iOS platform are ${Object.values(
            availableValues
          )
            .map(v => `"${v}"`)
            .join(' | ')}.`
        );
      }
      return result;
    })
    .addRule(['statusBar', 'hidden'])
    .addRule(
      ['statusBar', 'style'],
      utils_1.generateValidateEnumValue(constants_1.SplashScreenStatusBarStyle)
    )
    .addRule(['darkMode', 'backgroundColor'], utils_1.validateColor)
    .addRule(['darkMode', 'image'], (value, config) => {
      utils_1.ensurePropertyExists(config, ['darkMode', 'backgroundColor']);
      return utils_1.validateFileIsPng(value);
    });
  const validatedConfig = await validator.validate(config);
  return validatedConfig;
}
exports.validateIosConfig = validateIosConfig;
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
async function validateAndroidConfig(config) {
  const validator = new FromJsonValidator_1.default()
    .addRule(['backgroundColor'], utils_1.validateColor)
    .addRule(['image'], utils_1.validateFileIsPng)
    .addRule(['imageResizeMode'], (value, config) => {
      utils_1.ensurePropertyExists(config, ['image']);
      return utils_1.generateValidateEnumValue(constants_1.SplashScreenImageResizeMode)(value);
    })
    .addRule(['statusBar', 'hidden'])
    .addRule(
      ['statusBar', 'style'],
      utils_1.generateValidateEnumValue(constants_1.SplashScreenStatusBarStyle)
    )
    .addRule(['statusBar', 'translucent'])
    .addRule(['statusBar', 'backgroundColor'], utils_1.validateColor)
    .addRule(['darkMode', 'backgroundColor'], utils_1.validateColor)
    .addRule(['darkMode', 'image'], (value, config) => {
      utils_1.ensurePropertyExists(config, ['darkMode', 'backgroundColor']);
      return utils_1.validateFileIsPng(value);
    })
    .addRule(['darkMode', 'statusBar', 'style'], (value, config) => {
      utils_1.ensurePropertyExists(config, ['darkMode', 'backgroundColor']);
      utils_1.ensurePropertyExists(config, ['statusBar', 'style']);
      return utils_1.generateValidateEnumValue(constants_1.SplashScreenStatusBarStyle)(value);
    })
    .addRule(['darkMode', 'statusBar', 'backgroundColor'], (value, config) => {
      utils_1.ensurePropertyExists(config, ['darkMode', 'backgroundColor']);
      utils_1.ensurePropertyExists(config, ['statusBar', 'backgroundColor']);
      return utils_1.validateColor(value);
    });
  const validatedConfig = await validator.validate(config);
  return validatedConfig;
}
exports.validateAndroidConfig = validateAndroidConfig;
//# sourceMappingURL=index.js.map
