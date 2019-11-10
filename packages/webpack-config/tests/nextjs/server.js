const { startServerAsync } = require('../../../next-adapter/build');

startServerAsync(/* port: 3000 */).then(({ app, handle, server }) => {
  // started
});
