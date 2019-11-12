module.exports = require('./webpack/withUnimodules').default;

console.warn(
  '`@expo/webpack-config/withUnimodules` is deprecated, please use `import { withUnimodules } from @expo/webpack-config/addons` instead.'
);
