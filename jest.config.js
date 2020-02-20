module.exports = {
  projects: [
    require('./packages/android-manifest/jest.config'),
    require('./packages/config/jest.config'),
    require('./packages/schemer/jest.config'),
  ],
  testPathIgnorePatterns: ['.*'],
};
