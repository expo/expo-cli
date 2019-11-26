// Learn more: https://github.com/expo/expo/blob/master/docs/pages/versions/unversioned/guides/using-nextjs.md#using-a-custom-server
const { startServerAsync } = require('@expo/next-adapter');

startServerAsync(__dirname, {
  /* port: 3000 */
});
