<!-- Title -->
<h1 align="center">
👋 Welcome to <br><code>uri-scheme</code>
</h1>

<!-- Header -->

<p align="center">
    <b>Interact with native URI schemes</b>
    <br/>
    <br/>
    <a aria-label="Circle CI" href="https://circleci.com/gh/expo/expo-cli/tree/master">
        <img alt="Circle CI" src="https://flat.badgen.net/circleci/github/expo/expo-cli?label=Circle%20CI&labelColor=555555&icon=circleci">
    </a>
</p>

---

<!-- Body -->

This package provides a simple interface for modifying, viewing, and testing a project's native URI schemes.

👋 **Notice:** This package is not limited to Expo projects! You can use it with any iOS, or Android project.

## 🤔 Why?

We created `uri-scheme` to make it easier to setup, test, and modify deep links, and authentication in native apps.

## 🚀 Usage

**CLI**

```sh
# Usage
npx uri-scheme <uri> [options]

# View all URIs for a project
npx uri-scheme list

# Open a URI in a simulator
npx uri-scheme open <uri> --ios

# Add a URI to your project
npx uri-scheme add <uri>
```

**Node**

```js
import { Android, Ios } from 'uri-scheme';

Ios.openAsync({ uri: 'http://expo.io/' });
```

## ⚙️ Options

For more information run `npx uri-scheme --help` (or `-h`)

## License

The Expo source code is made available under the [MIT license](LICENSE). Some of the dependencies are licensed differently, with the BSD license, for example.

<!-- Footer -->

---

<p>
    <a aria-label="sponsored by expo" href="http://expo.io">
        <img src="https://img.shields.io/badge/Sponsored_by-Expo-4630EB.svg?style=for-the-badge&logo=EXPO&labelColor=000&logoColor=fff" target="_blank" />
    </a>
    <a aria-label="uri-scheme is free to use" href="/LICENSE" target="_blank">
        <img align="right" alt="License: MIT" src="https://img.shields.io/badge/License-MIT-success.svg?style=for-the-badge&color=33CC12" target="_blank" />
    </a>
</p>
