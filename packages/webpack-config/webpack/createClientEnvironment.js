function createClientEnvironment(locations, publicPath, nativeAppManifest) {
  const environment = process.env.NODE_ENV || 'development';
  const __DEV__ = environment !== 'production';

  const ENV_VAR_REGEX = /^(EXPO_|REACT_NATIVE_)/i;

  let processEnv = Object.keys(process.env)
    .filter(key => ENV_VAR_REGEX.test(key))
    .reduce(
      (env, key) => {
        env[key] = JSON.stringify(process.env[key]);
        return env;
      },
      {
        // Useful for determining whether we’re running in production mode.
        // Most importantly, it switches React into the correct mode.
        NODE_ENV: JSON.stringify(environment),

        // Useful for resolving the correct path to static assets in `public`.
        // For example, <img src={process.env.PUBLIC_URL + '/img/logo.png'} />.
        // This should only be used as an escape hatch. Normally you would put
        // images into the root folder and `import` them in code to get their paths.
        PUBLIC_URL: JSON.stringify(publicPath),

        // Surface the manifest for use in expo-constants
        APP_MANIFEST: JSON.stringify(nativeAppManifest),
      }
    );
  return {
    'process.env': processEnv,
    __DEV__,
  };
}

module.exports = createClientEnvironment;
