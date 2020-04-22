<!-- Title -->
<h1 align="center">
Expo CLI
</h1>

<p align="center">Tools for making Expo apps.</p>

<p align="center">
     
  <a aria-label="Join our forums" href="https://forums.expo.io" target="_blank">
    <img alt="" src="https://img.shields.io/badge/Ask%20Questions%20-blue.svg?style=flat-square&logo=discourse&logoWidth=15&labelColor=000000&color=4630EB">
  </a>
  <a aria-label="Expo is free to use" href="https://github.com/expo/expo/blob/master/LICENSE" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-success.svg?style=flat-square&color=33CC12" target="_blank" />
  </a>
<a aria-label="expo-cli downloads" href="http://www.npmtrends.com/expo-cli" target="_blank">
    <img alt="Downloads" src="https://img.shields.io/npm/dm/expo-cli.svg?style=flat-square&labelColor=gray&color=33CC12&label=Downloads" />
</a>
    <br>
    <a aria-label="Circle CI" href="https://circleci.com/gh/expo/expo-cli/tree/master">
    <img alt="Circle CI" src="https://flat.badgen.net/circleci/github/expo/expo-cli?label=Circle%20CI&labelColor=555555&icon=circleci">
  </a>
  
</p>

<p align="center">
  <a aria-label="expo documentation" href="https://docs.expo.io/versions/latest/workflow/expo-cli">📚 Read the Documentation</a>
  |
  <a aria-label="contribute to expo cli" href="https://github.com/expo/expo-cli/blob/master/CONTRIBUTING.md"><b>Contributing to Expo CLI</b></a>
</p>

<p>
  <a aria-label="Follow @expo on Twitter" href="https://twitter.com/intent/follow?screen_name=expo" target="_blank">
    <img  alt="Twitter: expo" src="https://img.shields.io/twitter/follow/expo.svg?style=flat-square&label=Follow%20%40expo&logo=TWITTER&logoColor=FFFFFF&labelColor=00aced&logoWidth=15&color=lightgray" target="_blank" />
  </a>
  <a aria-label="Follow Expo on Medium" href="https://blog.expo.io">
    <img align="right" alt="Medium: exposition" src="https://img.shields.io/badge/Learn%20more%20on%20our%20blog-lightgray.svg?style=flat-square" target="_blank" />
  </a>
</p>

---

- [📚 Documentation](#-documentation)
- [🗺 Project Layout](#-project-layout)
- [🏅 Badges](#-badges)
- [👏 Contributing](#-contributing)
- [❓ FAQ](#-faq)
- [💙 The Team](#-the-team)
- [License](#license)

## 📚 Documentation

<p>Learn about building and deploying universal apps <a aria-label="expo documentation" href="https://docs.expo.io">in our official docs!</a></p>

- [Using the CLI](https://docs.expo.io/versions/latest/workflow/expo-cli/)
- [App.json Configuration](https://docs.expo.io/versions/latest/workflow/configuration/)
- [Building and Deploying apps](https://docs.expo.io/versions/latest/introduction/walkthrough/#building-and-deploying)

## 🗺 Project Layout

| Package | Coverage | Version |
|----------|---------|--------|
| [`@expo/babel-preset-cli`](./packages/babel-preset-cli) | [![badges](https://codecov.io/gh/expo/expo-cli/branch/master/graph/badge.svg?flag=babel_preset_cli)](https://codecov.io/gh/expo/expo-cli/tree/master/packages/babel-preset-cli/src) | [![badges](https://img.shields.io/npm/v/@expo/babel-preset-cli.svg?style=flat-square&label=&labelColor=CB3837&color=000&logo=npm?cacheSeconds=3600)](https://www.npmjs.com/package/@expo/babel-preset-cli) |
| [`@expo/config`](./packages/config) | [![badges](https://codecov.io/gh/expo/expo-cli/branch/master/graph/badge.svg?flag=config)](https://codecov.io/gh/expo/expo-cli/tree/master/packages/config/src) | [![badges](https://img.shields.io/npm/v/@expo/config.svg?style=flat-square&label=&labelColor=CB3837&color=000&logo=npm?cacheSeconds=3600)](https://www.npmjs.com/package/@expo/config) |
| [`@expo/dev-tools`](./packages/dev-tools) | [![badges](https://codecov.io/gh/expo/expo-cli/branch/master/graph/badge.svg?flag=dev_tools)](https://codecov.io/gh/expo/expo-cli/tree/master/packages/dev-tools/src) | [![badges](https://img.shields.io/npm/v/@expo/dev-tools.svg?style=flat-square&label=&labelColor=CB3837&color=000&logo=npm?cacheSeconds=3600)](https://www.npmjs.com/package/@expo/dev-tools) |
| [`@expo/electron-adapter`](./packages/electron-adapter) | [![badges](https://codecov.io/gh/expo/expo-cli/branch/master/graph/badge.svg?flag=electron_adapter)](https://codecov.io/gh/expo/expo-cli/tree/master/packages/electron-adapter/src) | [![badges](https://img.shields.io/npm/v/@expo/electron-adapter.svg?style=flat-square&label=&labelColor=CB3837&color=000&logo=npm?cacheSeconds=3600)](https://www.npmjs.com/package/@expo/electron-adapter) |
| [`expo-cli`](./packages/expo-cli) | [![badges](https://codecov.io/gh/expo/expo-cli/branch/master/graph/badge.svg?flag=expo_cli)](https://codecov.io/gh/expo/expo-cli/tree/master/packages/expo-cli/src) | [![badges](https://img.shields.io/npm/v/expo-cli.svg?style=flat-square&label=&labelColor=CB3837&color=000&logo=npm?cacheSeconds=3600)](https://www.npmjs.com/package/expo-cli) |
| [`expo-codemod`](./packages/expo-codemod) | [![badges](https://codecov.io/gh/expo/expo-cli/branch/master/graph/badge.svg?flag=expo_codemod)](https://codecov.io/gh/expo/expo-cli/tree/master/packages/expo-codemod/src) | [![badges](https://img.shields.io/npm/v/expo-codemod.svg?style=flat-square&label=&labelColor=CB3837&color=000&logo=npm?cacheSeconds=3600)](https://www.npmjs.com/package/expo-codemod) |
| [`expo-optimize`](./packages/expo-optimize) | [![badges](https://codecov.io/gh/expo/expo-cli/branch/master/graph/badge.svg?flag=expo_optimize)](https://codecov.io/gh/expo/expo-cli/tree/master/packages/expo-optimize/src) | [![badges](https://img.shields.io/npm/v/expo-optimize.svg?style=flat-square&label=&labelColor=CB3837&color=000&logo=npm?cacheSeconds=3600)](https://www.npmjs.com/package/expo-optimize) |
| [`@expo/image-utils`](./packages/image-utils) | [![badges](https://codecov.io/gh/expo/expo-cli/branch/master/graph/badge.svg?flag=image_utils)](https://codecov.io/gh/expo/expo-cli/tree/master/packages/image-utils/src) | [![badges](https://img.shields.io/npm/v/@expo/image-utils.svg?style=flat-square&label=&labelColor=CB3837&color=000&logo=npm?cacheSeconds=3600)](https://www.npmjs.com/package/@expo/image-utils) |
| [`@expo/json-file`](./packages/json-file) | [![badges](https://codecov.io/gh/expo/expo-cli/branch/master/graph/badge.svg?flag=json_file)](https://codecov.io/gh/expo/expo-cli/tree/master/packages/json-file/src) | [![badges](https://img.shields.io/npm/v/@expo/json-file.svg?style=flat-square&label=&labelColor=CB3837&color=000&logo=npm?cacheSeconds=3600)](https://www.npmjs.com/package/@expo/json-file) |
| [`@expo/metro-config`](./packages/metro-config) | [![badges](https://codecov.io/gh/expo/expo-cli/branch/master/graph/badge.svg?flag=metro_config)](https://codecov.io/gh/expo/expo-cli/tree/master/packages/metro-config/src) | [![badges](https://img.shields.io/npm/v/@expo/metro-config.svg?style=flat-square&label=&labelColor=CB3837&color=000&logo=npm?cacheSeconds=3600)](https://www.npmjs.com/package/@expo/metro-config) |
| [`@expo/next-adapter`](./packages/next-adapter) | [![badges](https://codecov.io/gh/expo/expo-cli/branch/master/graph/badge.svg?flag=next_adapter)](https://codecov.io/gh/expo/expo-cli/tree/master/packages/next-adapter/src) | [![badges](https://img.shields.io/npm/v/@expo/next-adapter.svg?style=flat-square&label=&labelColor=CB3837&color=000&logo=npm?cacheSeconds=3600)](https://www.npmjs.com/package/@expo/next-adapter) |
| [`@expo/osascript`](./packages/osascript) | [![badges](https://codecov.io/gh/expo/expo-cli/branch/master/graph/badge.svg?flag=osascript)](https://codecov.io/gh/expo/expo-cli/tree/master/packages/osascript/src) | [![badges](https://img.shields.io/npm/v/@expo/osascript.svg?style=flat-square&label=&labelColor=CB3837&color=000&logo=npm?cacheSeconds=3600)](https://www.npmjs.com/package/@expo/osascript) |
| [`@expo/package-manager`](./packages/package-manager) | [![badges](https://codecov.io/gh/expo/expo-cli/branch/master/graph/badge.svg?flag=package_manager)](https://codecov.io/gh/expo/expo-cli/tree/master/packages/package-manager/src) | [![badges](https://img.shields.io/npm/v/@expo/package-manager.svg?style=flat-square&label=&labelColor=CB3837&color=000&logo=npm?cacheSeconds=3600)](https://www.npmjs.com/package/@expo/package-manager) |
| [`@expo/plist`](./packages/plist) | [![badges](https://codecov.io/gh/expo/expo-cli/branch/master/graph/badge.svg?flag=plist)](https://codecov.io/gh/expo/expo-cli/tree/master/packages/plist/src) | [![badges](https://img.shields.io/npm/v/@expo/plist.svg?style=flat-square&label=&labelColor=CB3837&color=000&logo=npm?cacheSeconds=3600)](https://www.npmjs.com/package/@expo/plist) |
| [`pod-install`](./packages/pod-install) | [![badges](https://codecov.io/gh/expo/expo-cli/branch/master/graph/badge.svg?flag=pod_install)](https://codecov.io/gh/expo/expo-cli/tree/master/packages/pod-install/src) | [![badges](https://img.shields.io/npm/v/pod-install.svg?style=flat-square&label=&labelColor=CB3837&color=000&logo=npm?cacheSeconds=3600)](https://www.npmjs.com/package/pod-install) |
| [`expo-pwa`](./packages/pwa) | [![badges](https://codecov.io/gh/expo/expo-cli/branch/master/graph/badge.svg?flag=pwa)](https://codecov.io/gh/expo/expo-cli/tree/master/packages/pwa/src) | [![badges](https://img.shields.io/npm/v/expo-pwa.svg?style=flat-square&label=&labelColor=CB3837&color=000&logo=npm?cacheSeconds=3600)](https://www.npmjs.com/package/expo-pwa) |
| [`@expo/schemer`](./packages/schemer) | [![badges](https://codecov.io/gh/expo/expo-cli/branch/master/graph/badge.svg?flag=schemer)](https://codecov.io/gh/expo/expo-cli/tree/master/packages/schemer/src) | [![badges](https://img.shields.io/npm/v/@expo/schemer.svg?style=flat-square&label=&labelColor=CB3837&color=000&logo=npm?cacheSeconds=3600)](https://www.npmjs.com/package/@expo/schemer) |
| [`uri-scheme`](./packages/uri-scheme) | [![badges](https://codecov.io/gh/expo/expo-cli/branch/master/graph/badge.svg?flag=uri_scheme)](https://codecov.io/gh/expo/expo-cli/tree/master/packages/uri-scheme/src) | [![badges](https://img.shields.io/npm/v/uri-scheme.svg?style=flat-square&label=&labelColor=CB3837&color=000&logo=npm?cacheSeconds=3600)](https://www.npmjs.com/package/uri-scheme) |
| [`@expo/webpack-config`](./packages/webpack-config) | [![badges](https://codecov.io/gh/expo/expo-cli/branch/master/graph/badge.svg?flag=webpack_config)](https://codecov.io/gh/expo/expo-cli/tree/master/packages/webpack-config/src) | [![badges](https://img.shields.io/npm/v/@expo/webpack-config.svg?style=flat-square&label=&labelColor=CB3837&color=000&logo=npm?cacheSeconds=3600)](https://www.npmjs.com/package/@expo/webpack-config) |
| [`@expo/xdl`](./packages/xdl) | [![badges](https://codecov.io/gh/expo/expo-cli/branch/master/graph/badge.svg?flag=xdl)](https://codecov.io/gh/expo/expo-cli/tree/master/packages/xdl/src) | [![badges](https://img.shields.io/npm/v/@expo/xdl.svg?style=flat-square&label=&labelColor=CB3837&color=000&logo=npm?cacheSeconds=3600)](https://www.npmjs.com/package/@expo/xdl) |

## 🏅 Badges

Let everyone know your app is universal with _Expo_!
<br/>

[![runs with expo](https://img.shields.io/badge/Runs%20with%20Expo-000.svg?style=flat-square&logo=EXPO&labelColor=f3f3f3&logoColor=000)](https://expo.io/)

[![runs with expo](https://img.shields.io/badge/Runs%20with%20Expo-4630EB.svg?style=flat-square&logo=EXPO&labelColor=f3f3f3&logoColor=000)](https://expo.io/)

```md
[![runs with expo](https://img.shields.io/badge/Runs%20with%20Expo-000.svg?style=flat-square&logo=EXPO&labelColor=f3f3f3&logoColor=000)](https://expo.io/)

[![runs with expo](https://img.shields.io/badge/Runs%20with%20Expo-4630EB.svg?style=flat-square&logo=EXPO&labelColor=f3f3f3&logoColor=000)](https://expo.io/)
```

## 👏 Contributing

If you like the Expo CLI and want to help make it better then check out our [contributing guide](/CONTRIBUTING.md)! Also check out the [Expo repo](http://github.com/expo/expo) to work on the Expo docs, modules, and components in the Expo SDK.

## ❓ FAQ

If you have questions about Expo and want answers, then check out our [Frequently Asked Questions](https://docs.expo.io/versions/latest/introduction/faq/)!

If you still have questions you can ask them on our [forums](https://forums.expo.io) or on Twitter [@Expo](https://twitter.com/expo).

## 💙 The Team

Curious about who makes Expo? Here are our [team members](https://expo.io/about)!

## License

The Expo source code is made available under the [MIT license](LICENSE). Some of the dependencies are licensed differently, with the BSD license, for example.

<!-- Footer -->

---

<p>
    <a aria-label="sponsored by expo" href="http://expo.io">
        <img src="https://img.shields.io/badge/Sponsored_by-Expo-4630EB.svg?style=for-the-badge&logo=EXPO&labelColor=000&logoColor=fff" target="_blank" />
    </a>
    <a aria-label="expo next-adapter is free to use" href="/packages/expo-cli/LICENSE" target="_blank">
        <img align="right" alt="License: MIT" src="https://img.shields.io/badge/License-MIT-success.svg?style=for-the-badge&color=33CC12" target="_blank" />
    </a>
</p>
