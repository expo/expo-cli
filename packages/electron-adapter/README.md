<!-- Title -->
<h1 align="center">
👋 Welcome to <br/><code>@expo/electron-adapter</code>
</h1>

<!-- Header -->

<p align="center">
    <b>Create Desktop apps with Expo and Electron!</b>
    <br/>
    <br/>
    <a aria-label="Circle CI" href="https://circleci.com/gh/expo/expo-cli/tree/master">
        <img alt="Circle CI" src="https://flat.badgen.net/circleci/github/expo/expo-cli?label=Circle%20CI&labelColor=555555&icon=circleci">
    </a>
</p>

---

## 🏁 Setup

Install `@expo/electron-adapter` in your project.

```sh
yarn add @expo/electron-adapter && yarn add -D @expo/webpack-config
```

## ⚽️ Usage

- Run `expo customize:web` and select `webpack.config.js`
- Replace the contents of your Webpack config with the following:

  `webpack.config.js`

  ```js
  const { withElectronAsync } = require('@expo/electron-adapter');

  module.exports = function(env, argv) {
    // This will automatically toggle between web and electron support based on how you run it:
    // expo start:web or expo start --web will use web
    // yarn expo-electron start will use Electron
    return withElectronAsync(env, argv /* (env, argv) => { create a custom config } */);
  };
  ```

- Start the project with `yarn expo-electron start`
- (Heavy WIP) Build for production with `yarn expo-electron build`
  - To test builds faster use `EXPO_ELECTRON_DEBUG_REBUILD=true yarn expo-electron build`
  - Builds are done with `electron-builder` you can configure it by creating a `expo-electron.config.json` or `expo-electron.config.js` file in your root.

## 🥨 Behavior

- Expo resolves files with `.electron.js` & `.web.js` extensions in that order. If you want to use `electron` features then put them in a file like `foo.electron.js`.

## Main Process

TL;DR: `yarn expo-electron customize`

To get you started as fast as possible this library starts you with a default "main process" that will update with the library and become more robust in the future. Think of this like the native code in the Expo Client app (but not really because it's still JS and easy).

You'll probably want to customize this main process code to enable more robust native functionality, to do this simply run `yarn expo-electron customize`. This will generate an `electron/` folder and copy all of the default main process code to it. Notice that `@expo/electron-adapter` will completely skip the default template if an `electron/` folder exists in the root of your project.

To revert back to the default or reset to the latest default template simply delete the `electron/` folder and the adapter will go back to using the hidden default code.

## License

The Expo source code is made available under the [MIT license](LICENSE). Some of the dependencies are licensed differently, with the BSD license, for example.

<!-- Footer -->

---

<p>
    <a aria-label="sponsored by expo" href="http://expo.io">
        <img src="https://img.shields.io/badge/Sponsored_by-Expo-4630EB.svg?style=for-the-badge&logo=EXPO&labelColor=000&logoColor=fff" target="_blank" />
    </a>
    <a aria-label="expo electron-adapter is free to use" href="/LICENSE" target="_blank">
        <img align="right" alt="License: MIT" src="https://img.shields.io/badge/License-MIT-success.svg?style=for-the-badge&color=33CC12" target="_blank" />
    </a>
</p>
