const createExpoWebpackConfigAsync = require('../..');

module.exports = async function(env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      report: true,
    },
    argv
  );
  return config;
};
