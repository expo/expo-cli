'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
          enumerable: true,
          get: function () {
            return m[k];
          },
        });
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== 'default' && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.ensurePropertyExists = exports.generateValidateEnumValue = exports.validateColor = exports.validateFileExists = exports.validateFileIsPng = exports.validateEnumValue = void 0;
const color_string_1 = __importDefault(require('color-string'));
const fs = __importStar(require('fs-extra'));
const lodash_1 = require('lodash');
const path_1 = __importDefault(require('path'));
/**
 * @param value Value to be checked.
 * @param availableValues Object storing all available options as values.
 */
function validateEnumValue(value, availableValues) {
  if (!Object.values(availableValues).includes(value)) {
    throw new Error(
      `Invalid value '${value}'. Available values are ${Object.values(availableValues)
        .map(v => `"${v}"`)
        .join(' | ')}.`
    );
  }
  return value;
}
exports.validateEnumValue = validateEnumValue;
/**
 * @param filePath Relative or absolute path to a file.
 * @returns Absolute path to the valid image file.
 */
async function validateFileIsPng(filePath) {
  const resolvedPath = await validateFileExists(filePath);
  // check if resolvedPath is a readable .png file
  if (path_1.default.extname(resolvedPath) !== '.png') {
    throw new Error(
      `Invalid path '${filePath}' - file is not a .png file. Provide a path to a file with .png extension.`
    );
  }
  return resolvedPath;
}
exports.validateFileIsPng = validateFileIsPng;
/**
 * @param filePath Relative or absolute path to a file.
 * @returns Absolute path to the resolved file.
 */
async function validateFileExists(filePath) {
  const resolvedPath = path_1.default.resolve(filePath);
  if (!(await fs.pathExists(resolvedPath))) {
    throw new Error(
      `Invalid path '${filePath}' - file does not exist. Provide a path to an existing file.`
    );
  }
  return resolvedPath;
}
exports.validateFileExists = validateFileExists;
/**
 * @param value Value to be checked.
 */
function validateColor(value) {
  var _a;
  const result =
    (_a = color_string_1.default.get(value)) === null || _a === void 0 ? void 0 : _a.value;
  if (!result) {
    throw new Error(
      `Invalid value '${value}' - value is not a color string. Provide a valid color string.`
    );
  }
  return result;
}
exports.validateColor = validateColor;
function generateValidateEnumValue(availableValues) {
  return value => validateEnumValue(value, availableValues);
}
exports.generateValidateEnumValue = generateValidateEnumValue;
function ensurePropertyExists(object, propertyPath) {
  const value = lodash_1.get(object, propertyPath, undefined);
  if (value === undefined) {
    throw new Error(
      `Missing a required valid value for '${propertyPath.join(
        '.'
      )}'. Provide a valid value for it to enable this property.`
    );
  }
}
exports.ensurePropertyExists = ensurePropertyExists;
//# sourceMappingURL=utils.js.map
