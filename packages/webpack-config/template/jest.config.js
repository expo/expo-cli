const { withWatchPlugins } = require('jest-expo/config');

module.exports = withWatchPlugins({
  projects: [
    // Add changes to any platform...
    require('jest-expo/web/jest-preset'),
    require('jest-expo/node/jest-preset'),
    require('jest-expo/ios/jest-preset'),
    require('jest-expo/android/jest-preset'),
  ],
});
