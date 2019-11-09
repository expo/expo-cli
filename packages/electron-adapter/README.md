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

This package wraps `electron-webpack` and adds support for Expo web and other universal React packages.

## 🏁 Setup

- Install the package in your project: `yarn add @expo/electron-adapter`
- Create a new `electron-webpack` config file: `touch ./electron-webpack.js`
- Replace the contents of your config with the following:

  `electron-webpack.js`

  ```js
  const { withExpoAdapter } = require('@expo/electron-adapter');

  module.exports = withExpoAdapter({
    projectRoot: __dirname,
    // Provide any overrides for electron-webpack: https://github.com/electron-userland/electron-webpack/blob/master/docs/en/configuration.md
  });
  ```

## ⚽️ Usage

### Starting a project

- Start the project with `yarn expo-electron start`
  - Currently this is just an alias for the following script: `ELECTRON_DISABLE_SECURITY_WARNINGS=1 electron-webpack dev`
  - `ELECTRON_DISABLE_SECURITY_WARNINGS=1` disables the useless warnings in your project.

### Customizing the main process

- To reveal the main process (highly recommended) use: `yarn expo-electron customize`
  - This will generate the `electron/main/` and `electron/webpack.config.js` files for you to customize.
  - Everything running in the `electron/main/` folder is on a different process to the rest of your app. Think of this like the native code in the Expo Client app (but not really because it's JavaScript and easy).
- To revert back to the default main process or reset to the latest default template simply delete the `electron/` folder and the adapter will go back to using the hidden version.

### Building your project

`@expo/electron-adapter` doesn't do anything to streamline building Expo Electron projects just yet. But until it does here is a guide for building projects using [`electron-builder`](https://www.electron.build/).

- Install the package with `yarn add -D electron-builder`
- Use the builder with: `yarn electron-webpack && yarn electron-builder --dir -c.compression=store -c.mac.identity=null` (`-c.compression=store` speeds the builds up a lot, delete this for actual production builds)
- Learn more about configuring your build here: [Configuring electron-builder](https://www.electron.build/configuration/configuration)

## 🥨 Behavior

- Expo resolves files with `.electron.js` & `.web.js` extensions in that order. If you want to use `electron` features then put them in a file like `foo.electron.js`.
- Every universal package you have installed will be transpiled automatically, this includes packages that start with the name: `expo`, `@expo`, `@unimodules`, `@react-navigation`, `react-navigation`, `react-native`. You can add more by appending them to the array for key `expo.web.build.babel.include` in your `app.json` (this feature is experimental and subject to change).

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
