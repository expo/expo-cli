module.exports = () => ({
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: '8.9.0',
        },
      },
    ],
    '@babel/preset-typescript',
  ],
  plugins: ['@babel/plugin-proposal-class-properties', '@babel/plugin-proposal-object-rest-spread'],
});
