module.exports = function (api: any) {
  // Detect web usage (this may change in the future if Next.js changes the loader)
  const isWeb = api.caller(
    (caller?: { name: string }) =>
      caller && (caller.name === 'babel-loader' || caller.name === 'next-babel-turbo-loader')
  );

  return {
    presets: [
      // Only use next in the browser, it'll break your native project
      isWeb && require('next/babel'),
      [
        require('babel-preset-expo'),
        {
          web: { useTransformReactJSXExperimental: true },
          // Disable the `no-anonymous-default-export` plugin in babel-preset-expo
          // so users don't see duplicate warnings.
          'no-anonymous-default-export': false,
        },
      ],
    ].filter(Boolean),
  };
};
