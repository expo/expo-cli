# xdl

The Expo Development Library.
[Documentation](https://docs.expo.io/workflow/expo-cli/)

If you have problems with the code in this repository, please file issues & bug reports
at https://github.com/expo/expo. Thanks!

## Building Watchman

Configure with `./configure --disable-statedir --without-pcre` to use TMPDIR for the watchman state.

## Environment Variables

### EXPO_WEB_BUILD_STRICT

All warnings will be treated as errors in CI.

### EXPO_WEB_DEBUG

When you have errors in the production build that aren't present in the development build you can use `EXPO_WEB_DEBUG=true expo start --no-dev` to debug those errors.

- Prevent the production build from being minified.
- Include file path info comments in the bundle.

### EXPO_WEB_INFO

Print a diagnostic report of the Webpack config.
