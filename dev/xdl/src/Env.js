function home() {
  return process.env.HOME;
}

function isStaging() {
  return !!process.env.EXPONENT_STAGING;
}

function isLocal() {
  return !!process.env.EXPONENT_LOCAL;
}

module.exports = {
  home,
  isStaging,
  isLocal,
};
