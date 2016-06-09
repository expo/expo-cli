function home() {
  return process.env.HOME;
}

function isStaging() {
  return !!process.env.EXPONENT_STAGING;
}

module.exports = {
  home,
  isStaging,
};
