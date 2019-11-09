const { withElectronAsync } = require('../');

module.exports = function(env, argv) {
  return withElectronAsync(env, argv);
};
