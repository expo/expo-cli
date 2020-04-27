module.exports = {
  preset: '@expo/jest-preset-cli',
  displayName: require('./package').name,
  rootDir: __dirname,
  roots: ['__mocks__', 'src'],
};
