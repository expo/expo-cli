module.exports = api => {
  api.cache(true);

  return {
    presets: ['next/babel'],
    plugins: [
      ['emotion', { inline: true }],
      [
        'module-resolver',
        {
          alias: {
            app: '.',
          },
        },
      ],
      [require.resolve('@babel/plugin-proposal-decorators'), { legacy: true }],
    ],
  };
};
