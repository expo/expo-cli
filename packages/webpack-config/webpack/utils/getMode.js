/**
 * mode -> production -> development -> process.env.NODE_ENV -> 'development'
 */
module.exports = function getMode({ production, development, mode }) {
  if (isValidMode(mode)) {
    return mode.toLowerCase();
  } else if (production) {
    return 'production';
  } else if (development) {
    return 'development';
  } else if (isValidMode(process.env.NODE_ENV)) {
    return process.env.NODE_ENV.toLowerCase();
  }

  return 'development';
};

function isValidMode(inputMode) {
  let mode;
  if (inputMode && inputMode.toLowerCase) {
    mode = inputMode.toLowerCase();
  }
  return mode === 'production' || mode === 'development';
}
