// Learn more: https://github.com/expo/expo/blob/master/docs/pages/versions/unversioned/guides/using-nextjs.md#shared-steps

let hasCheckedModules = false;

module.exports = function (api: any) {
  // Detect web usage (this may change in the future if Next.js changes the loader)
  const isWeb = api.caller(
    (caller?: { name: string }) =>
      caller && (caller.name === 'babel-loader' || caller.name === 'next-babel-turbo-loader')
  );

  // Check peer dependencies
  if (!hasCheckedModules) {
    hasCheckedModules = true;
    // Only check for next support in the browser...
    const missingPackages = [isWeb && 'next/babel', 'babel-preset-expo'].filter(
      packageName => packageName && !hasModule(packageName)
    );
    // Throw an error if anything is missing
    if (missingPackages.length)
      throw new Error(
        `[BABEL]: preset \`@expo/next-adapter/babel\` is missing peer dependencies: ${missingPackages.join(
          ', '
        )}`
      );
  }

  return {
    presets: [
      // Only use next in the browser, it'll break your native project
      isWeb && require('next/babel'),
      [
        require('babel-preset-expo'),
        {
          web: { useTransformReactJsxExperimental: true },
          // Disable the `no-anonymous-default-export` plugin in babel-preset-expo
          // so users don't see duplicate warnings.
          'no-anonymous-default-export': false,
        },
      ],
    ].filter(Boolean),
  };
};

function hasModule(name: string): boolean {
  try {
    return !!require.resolve(name);
  } catch (error: any) {
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes(name)) {
      return false;
    }
    throw error;
  }
}
