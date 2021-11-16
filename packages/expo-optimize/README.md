<!-- Title -->
<h1 align="center">
👋 Welcome to <br><code>expo-optimize</code>
</h1>

<!-- Header -->

<p align="center">
    <b>Compress the assets in your project</b>
    <br/>
    <br/>
    <a aria-label="Circle CI" href="https://circleci.com/gh/expo/expo-cli/tree/master">
        <img alt="Circle CI" src="https://flat.badgen.net/circleci/github/expo/expo-cli?label=Circle%20CI&labelColor=555555&icon=circleci">
    </a>
</p>

---

<!-- Body -->

This library uses the natively powered package [Sharp](https://sharp.pixelplumbing.com) behind the scenes to optimally reduce your project's assets for use in an app or website.

👋 **Notice:** This package is not limited to Expo projects! This can be used with projects bootstrapped with community CLIs like [ignite](https://github.com/infinitered/ignite) by Infinite Red, or [react-native-cli](https://github.com/react-native-community/cli) by the React Native community.

## 🚀 Usage

```sh
# Run this once to install the sharp image processing utility.
# If this cannot be installed on your computer then you won't be able to optimize images.
npm install -g sharp-cli

# To optimize images simply run this
npx expo-optimize <project-directory> [options]
```

## 🤔 Why?

We created `optimize` to improve our docs and websites (Next, Gatsby, React), and our native apps (React & Expo). Optimizing images can noticeable improve your native app and website's **TTI** (or time-to-interaction) which means less time on splash screens and quicker delivery over poor network connections.

## ⚙️ Options

For more information run `npx expo-optimize --help` (or `-h`)

| Shortcut | Flag        | Input       | Description                                                                   | Default                                                 |
| -------- | ----------- | ----------- | ----------------------------------------------------------------------------- | ------------------------------------------------------- |
| `-q`     | `--quality` | `[number]`  | The quality each image will attempt to be reduced to                          | `80`                                                    |
| `-i`     | `--include` | `[pattern]` | Include only assets that match this glob pattern relative to the project root | [`expo.assetBundlePatterns: []`][abp] in the `app.json` |
| `-e`     | `--exclude` | `[pattern]` | Exclude all assets that match this glob pattern relative to the project root  | `'**/node_modules/**', '**/ios/**', '**/android/**'`    |
| `-s`     | `--save`    |             | Save the original assets with a .orig extension                               |                                                         |
| `-h`     | `--help`    |             | output usage information                                                      |                                                         |
| `-V`     | `--version` |             | output the version number                                                     |                                                         |

## 📚 Further Reading

Read more about how this package works here: [Image compression in Expo projects](https://blog.expo.dev/image-compression-with-expo-cli-d32d15cc8b73).

## Related

- [sharp](https://sharp.pixelplumbing.com/) - native image editing library for node
- [expo-cli](https://docs.expo.dev/workflow/expo-cli/) - the original location for this command
  <!-- - [react-native-cli optimize](https://github.com/react-native-community/cli/pull/419) - an alias for this command -->

## License

The Expo source code is made available under the [MIT license](LICENSE). Some of the dependencies are licensed differently, with the BSD license, for example.

<!-- Footer -->

---

<p>
    <a aria-label="sponsored by expo" href="http://expo.dev">
        <img src="https://img.shields.io/badge/Sponsored_by-Expo-4630EB.svg?style=for-the-badge&logo=EXPO&labelColor=000&logoColor=fff" target="_blank" />
    </a>
    <a aria-label="expo-optimize is free to use" href="/LICENSE" target="_blank">
        <img align="right" alt="License: MIT" src="https://img.shields.io/badge/License-MIT-success.svg?style=for-the-badge&color=33CC12" target="_blank" />
    </a>
</p>

[abp]: https://docs.expo.dev/versions/latest/config/app/#assetbundlepatterns
