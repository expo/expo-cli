module.exports = {
  presets: [
    '@expo/babel-preset-cli',
    [
      'minify',
      {
        mangle: false,
      },
    ],
  ],
};
