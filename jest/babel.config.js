module.exports = function (api) {
  api.cache(true);
  return {
    // Only use this when running tests
    env: {
      test: {
        presets: ['../packages/babel-preset-cli'],
      },
    },
  };
};
