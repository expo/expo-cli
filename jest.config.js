module.exports = {
  projects: [
    {
      ...require('./packages/android-manifest/jest.config'),
      rootDir: './packages/android-manifest',
    },
  ],
};
