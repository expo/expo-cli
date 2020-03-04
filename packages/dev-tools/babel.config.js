module.exports = api => {
  const isTest = api.env('test');

  // Hack to circumvent old version of Next.js being used.
  if (isTest) return {};

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
      'transform-decorators-legacy',
    ],
  };
};
