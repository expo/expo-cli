function getDevtool(env, { devtool }) {
  if (env.production) {
    // string or false
    if (devtool !== undefined) {
      // When big assets are involved sources maps can become expensive and cause your process to run out of memory.
      return devtool;
    }
    return 'source-map';
  }
  if (env.development) {
    return 'cheap-module-source-map';
  }
  return false;
}

module.exports = getDevtool;
