module.exports = {
  projects: [
    require('./packages/android-manifest/jest.config'),
    require('./packages/config/jest.config'),
    require('./packages/expo-codemod/jest.config'),
    require('./packages/json-file/jest.config'),
    require('./packages/package-manager/jest.config'),
    require('./packages/schemer/jest.config'),
    require('./packages/webpack-config/jest/unit-test-config'),
    require('./packages/xdl/jest/unit-test-config'),
  ],
  testPathIgnorePatterns: ['.*'],
};
