const createExpoWebpackConfigAsync = require('../..');

module.exports = async function(env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      removeUnusedImportExports: process.env.TESTING_REMOVE_UNUSED_IMPORT_EXPORTS,
      report: !process.env.CI,
    },
    argv
  );
  return config;
};
