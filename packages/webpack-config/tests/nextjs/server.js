const { startServerAsync } = require('../../../next-adapter');

startServerAsync(/* port: 3000 */).then(({ app, handle, server }) => {
  // started
});
