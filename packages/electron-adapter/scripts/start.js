const fs = require('fs');
const { Webpack } = require('@expo/xdl');
const { start } = require('../');
const projectRoot = fs.realpathSync(process.cwd());

process.on('unhandledRejection', err => {
  throw err;
});

process.env.EXPO_ELECTRON_ENABLED = true;

console.log();
console.log('Starting Expo Electron project...');

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

  start(projectRoot, {
    url,
    port,
    host,
    protocol,
  });
});
