module.exports = {
  projects: [
    require('./packages/android-manifest/jest.config'),
    require('./packages/webpack-config/jest/unit-test-config'),
  ],
  testPathIgnorePatterns: ['.*'],
};
