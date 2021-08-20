# expo-metro-config

A Metro config for running React Native projects with the Metro bundler.

## Side Effects

This config ensures that the required side-effects for certain packages are applied when needed. This currently includes `react-native-gesture-handler` and `expo-dev-client`.

If you have any of the following side-effect imports, you can now remove them:

```js
import 'react-native-gesture-handler';

// or

import 'expo-dev-client';
```

## Babel

This config uses Babel to transpile JavaScript. By default, if your project does not have a `babel.config.js`, `.babelrc`, or `.babelrc.js`, a default Babel preset will be used. The default is [`babel-preset-expo`](https://www.npmjs.com/package/babel-preset-expo) which extends the default Metro preset for React Native and adds other features for more optimal tree-shaking (smaller production bundles).

## Debugging

You can see some of the resolved settings by using the envar `EXPO_DEBUG=1` before running any command that uses the Metro Bundler.

You can debug the internals of Metro by using the envar `DEBUG=*`.
