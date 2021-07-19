// Learn more: https://github.com/expo/expo/blob/master/docs/pages/versions/unversioned/guides/using-nextjs.md#withexpo

const { withExpo } = require('@expo/next-adapter');
const withPlugins = require('next-compose-plugins');
const withTM = require('next-transpile-modules')(['react-native-web']);

const nextConfig = {};

module.exports = withPlugins([withTM, [withExpo, { projectRoot: __dirname }]], nextConfig);
