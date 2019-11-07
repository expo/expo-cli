const chalk = require('chalk');
const { realpathSync } = require('fs');
const { Webpack } = require('@expo/xdl');
const { buildAsync } = require('../');

process.on('unhandledRejection', err => {
  throw err;
});

const projectRoot = realpathSync(process.cwd());

process.env.EXPO_ELECTRON_ENABLED = true;

console.log();
console.log(chalk.magenta('\u203A Building Expo Electron project...'));

Webpack.bundleAsync(projectRoot, {
  mode: 'production',
}).then(() => {
  const outputPath = process.env.WEBPACK_BUILD_OUTPUT_PATH;
  buildAsync(projectRoot, {
    outputPath,
  });
});
