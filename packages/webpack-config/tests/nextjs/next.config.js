const withOffline = require('next-offline');
const { withExpo } = require('../../../next-adapter/build');

// If you didn't install next-offline, then simply delete this method and the import.
module.exports = withOffline({
  workboxOpts: {
    swDest: 'workbox-service-worker.js',

    /* changing any value means you'll have to copy over all the defaults  */
    /* next-offline */
    globPatterns: ['static/**/*'],
    globDirectory: '.',
    runtimeCaching: [
      {
        urlPattern: /^https?.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'offlineCache',
          expiration: {
            maxEntries: 200,
          },
        },
      },
    ],
  },
  ...withExpo({
    projectRoot: __dirname,
  }),
});
