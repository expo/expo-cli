function createClientEnvironment(locations, PWAManifest) {
  function getAppManifest() {
    const appJSON = require(locations.appJson);
    const appManifest = appJSON.expo || appJSON;

    let web;
    try {
      web = require(locations.production.manifest);
    } catch (e) {
      web = {};
    }

    return {
      /**
       * Omit app.json properties that get removed during the native turtle build
       *
       * `facebookScheme`
       * `facebookAppId`
       * `facebookDisplayName`
       */
      name: appManifest.displayName || appManifest.name,
      description: appManifest.description,
      slug: appManifest.slug,
      sdkVersion: appManifest.sdkVersion,
      version: appManifest.version,
      githubUrl: appManifest.githubUrl,
      orientation: appManifest.orientation,
      primaryColor: appManifest.primaryColor,
      privacy: appManifest.privacy,
      icon: appManifest.icon,
      scheme: appManifest.scheme,
      notification: appManifest.notification,
      splash: appManifest.splash,
      androidShowExponentNotificationInShellApp:
        appManifest.androidShowExponentNotificationInShellApp,
      web,
    };
  }
  const environment = process.env.NODE_ENV || 'development';
  const __DEV__ = environment !== 'production';

  const ENV_VAR_REGEX = /^(EXPO_|REACT_NATIVE_)/i;

  const publicUrl = '';

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
        PUBLIC_URL: JSON.stringify(publicUrl),

        // Surface the manifest for use in expo-constants
        APP_MANIFEST: JSON.stringify(getAppManifest()),
      }
    );
  return {
    'process.env': processEnv,
    __DEV__,
  };
}

module.exports = createClientEnvironment;
