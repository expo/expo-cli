<!-- Title -->
<h1 align="center">
👋 Welcome to <br><code>@expo/android-manifest</code>
</h1>

<!-- Header -->

<p align="center">
    <b>A library for interacting with the `AndroidManifest.xml`</b>
    <br/>
    <br/>
    <a aria-label="Circle CI" href="https://circleci.com/gh/expo/expo-cli/tree/master">
        <img alt="Circle CI" src="https://flat.badgen.net/circleci/github/expo/expo-cli?label=Circle%20CI&labelColor=555555&icon=circleci">
    </a>
</p>

---

<!-- Body -->

## 🏁 Setup

Install `@expo/android-manifest` in your project.

```sh
yarn add @expo/android-manifest
```

## ⚽️ Usage

```ts
import * as Manifest from '@expo/android-manifest';

// Read the project's manifest
const manifest = await Manifest.readAsync(manifestPath);

// Get the Android app permissions as an array
const permissions: string[] = Manifest.getPermissions(manifest);
```

## License

The Expo source code is made available under the [MIT license](LICENSE). Some of the dependencies are licensed differently, with the BSD license, for example.

<!-- Footer -->

---

<p>
    <a aria-label="sponsored by expo" href="http://expo.io">
        <img src="https://img.shields.io/badge/SPONSORED%20BY%20EXPO-4630EB.svg?style=for-the-badge" target="_blank" />
    </a>
    <a aria-label="@expo/android-manifest is free to use" href="/LICENSE" target="_blank">
        <img align="right" alt="License: MIT" src="https://img.shields.io/badge/License-MIT-success.svg?style=for-the-badge&color=33CC12" target="_blank" />
    </a>
</p>
