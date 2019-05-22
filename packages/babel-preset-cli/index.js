module.exports = () => ({
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: '8.0.0',
        },
      },
    ],
    '@babel/preset-typescript',
  ],
  plugins: ['@babel/plugin-proposal-class-properties', '@babel/plugin-proposal-object-rest-spread'],
});
