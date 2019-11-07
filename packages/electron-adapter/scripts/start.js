const chalk = require('chalk');
const fs = require('fs');
const { Webpack } = require('@expo/xdl');
const { startAsync } = require('../');
const projectRoot = fs.realpathSync(process.cwd());

process.on('unhandledRejection', err => {
  throw err;
});

process.env.EXPO_ELECTRON_ENABLED = true;

console.log();
console.log(chalk.magenta('\u203A Starting Expo Electron project...'));

Webpack.startAsync(projectRoot, {
  mode: process.env.NODE_ENV || 'development',
}).then(({ url, port, host, protocol }) => {
  ['SIGINT', 'SIGTERM'].forEach(function(sig) {
    process.on(sig, function() {
      Webpack.stopAsync(projectRoot).then(() => {
        process.exit();
      });
    });
  });

  startAsync(projectRoot, {
    url,
    port,
    host,
    protocol,
  }).then(data => {
    if (process.env.EXPO_ELECTRON_TEST_START) {
      process.exit(data ? 1 : 0);
    }
  });
});
