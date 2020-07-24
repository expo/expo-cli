export default {
  name: 'basic',
  description: 'A Neat Expo App',
  icon:
    'https://github.com/expo/expo/blob/master/templates/expo-template-blank/assets/icon.png?raw=true',
  splash: {
    image:
      'https://github.com/expo/expo/blob/master/templates/expo-template-blank/assets/splash.png?raw=true',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  web: {
    build: {
      babel: {
        use: {
          options: {
            cacheIdentifier: 'custom-value-to-skip-babel-config-error',
          },
        },
      },
    },
  },
};
