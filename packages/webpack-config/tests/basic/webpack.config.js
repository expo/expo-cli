const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const { withElectronAsync } = require('../../../electron-adapter');
module.exports = async function(env, argv) {
  if (process.env.EXPO_ELECTRON_ENABLED) {
    return withElectronAsync({
      webpack: () => createExpoWebpackConfigAsync(env, argv),
      projectRoot: env.projectRoot,
    });
  }

  return createExpoWebpackConfigAsync(env, argv);
};
