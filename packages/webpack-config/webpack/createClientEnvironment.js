/**
 * This creates environment variables that won't be tree shaken.
 */
module.exports = function createClientEnvironment(mode, publicPath, nativeAppManifest) {
  const environment = mode || 'development';
  const __DEV__ = environment !== 'production';

  const ENV_VAR_REGEX = /^(EXPO_|REACT_NATIVE_|CI$)/i;

  const processEnv = Object.keys(process.env)
    .filter(key => ENV_VAR_REGEX.test(key))
    .reduce(
      (env, key) => {
        env[key] = JSON.stringify(process.env[key]);
        return env;
      },
      {
        /**
         * Useful for determining whether we’re running in production mode.
         * Most importantly, it switches React into the correct mode.
         */
        NODE_ENV: JSON.stringify(environment),

        /**
         * Useful for resolving the correct path to static assets in `public`.
         * For example, <img src={process.env.PUBLIC_URL + '/img/logo.png'} />.
         * This should only be used as an escape hatch. Normally you would put
         * images into the root folder and `import` them in code to get their paths.
         */
        PUBLIC_URL: JSON.stringify(publicPath),

        /**
         * Surfaces the `app.json` (config) as an environment variable which is then parsed by
         * `expo-constants` https://docs.expo.io/versions/latest/sdk/constants/
         */
        APP_MANIFEST: JSON.stringify(nativeAppManifest),
      }
    );
  return {
    'process.env': processEnv,
    __DEV__,
  };
};
