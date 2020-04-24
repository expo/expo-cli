module.exports = function(api) {
  const isWeb = api.caller(caller => caller && caller.name === 'babel-loader');

  return {
    presets: [
      'babel-preset-expo',
      // Only use next in the browser
      isWeb && 'next/babel',
    ].filter(Boolean),
  };
};
