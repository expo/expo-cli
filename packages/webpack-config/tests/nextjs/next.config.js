const withOffline = require('next-offline');
const { withExpo } = require('../../../next-adapter/build');

module.exports = withOffline(
  withExpo({
    workboxOpts: {
      swDest: 'workbox-service-worker.js',
    },
    projectRoot: __dirname,
  })
);
