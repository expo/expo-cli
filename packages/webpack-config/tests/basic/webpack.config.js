const { withElectronAsync } = require('../../../electron-adapter');

module.exports = function(env, argv) {
  return withElectronAsync(env, argv);
};
