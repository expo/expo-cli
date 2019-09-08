'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
/**
 * mode -> production -> development -> process.env.NODE_ENV -> 'development'
 */
function getMode({ production, development, mode }) {
  if (mode === undefined) {
    if (process.env.NODE_ENV != null && isValidMode(process.env.NODE_ENV)) {
      return process.env.NODE_ENV.toLowerCase();
    }
  } else if (isValidMode(mode)) {
    return mode.toLowerCase();
  } else if (production) {
    return 'production';
  } else if (development) {
    return 'development';
  }
  return 'development';
}
function isValidMode(inputMode) {
  let mode;
  if (inputMode && inputMode.toLowerCase) {
    mode = inputMode.toLowerCase();
  }
  return mode === 'production' || mode === 'development';
}
exports.default = getMode;
//# sourceMappingURL=getMode.js.map
