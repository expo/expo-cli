<!-- Title -->
<h1 align="center">
👋 Welcome to <br><code>expo-pwa</code>
</h1>

<!-- Header -->

<p align="center">
    <b>Generate PWA files for your project</b>
    <br/>
    <br/>
    <a aria-label="Circle CI" href="https://circleci.com/gh/expo/expo-cli/tree/main">
        <img alt="Circle CI" src="https://flat.badgen.net/circleci/github/expo/expo-cli?label=Circle%20CI&labelColor=555555&icon=circleci">
    </a>
</p>

---

<!-- Body -->

## 🚀 Usage

You can use this package with npx or globally install:

```sh
# npx
npx expo-pwa [options]

# global
npm i -g expo-pwa
```

Optionally, you can install the sharp CLI globally before using this CLI for native image editing:

```sh
npm install -g sharp-cli
```

## 🤔 Why?

This package was created as a universal solution for creating PWA assets locally, with _optional_ native acceleration via Sharp CLI, falling back on Jimp for wider device compatibility. Internally the `@expo/webpack-config` uses this package to generate PWA compliant website for Expo projects. By splitting this logic out of the Webpack config, we can generate PWAs for Next.js and Gatsby projects as well!

> Image generation is not limited to Expo projects.

## Usage In Expo

You can use this CLI to generate PWA assets manually and skip the Expo Webpack PWA generation step, effectively speeding up your production builds.

To do this, you'll need to first eject the `web/index.html`

```sh
expo customize:web
# select the `web/index.html` option
```

Now you can run any of the PWA commands, for this example we'll generate favicons. Assuming you have an image at `./assets/icon.png`, run the following command from the root project folder.

> Note: This also works for remote images!

```sh
expo-pwa favicon ./assets/icon.png
```

The images by default will be created in the Expo web static folder `web/` (this can be changed using the `--output` flag). You should see the following output:

```sh
$ expo-pwa favicon ./assets/icon.png

› Copy the following lines into your HTML <head/> to link the new assets.

<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png"></link>
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png"></link>
<link rel="shortcut icon" href="/favicon.ico"></link>
```

Simply copy the last few lines into the `<head />` of your `web/index.html`. When you build your project with `expo build:web`, the new favicons will be copied over from the `web/` folder, and Webpack will skip the Favicon generation step.

> If you don't use all of the links, the Webpack config will attempt to create the missing ones using the values specified in your Expo project config.

You can always disable all PWA generation with `expo build:web --no-pwa`.

## Commands

For more info run:

```sh
expo-pwa --help

# For command info, run `expo-pwa <command> --help`

expo-pwa splash --help
```

| command    | description                                           |
| ---------- | ----------------------------------------------------- |
| `icon`     | Generate the home screen icons for a PWA              |
| `favicon`  | Generate the favicons for a website                   |
| `splash`   | Generate the Safari splash screens for a PWA          |
| `manifest` | Generate the PWA manifest from an Expo project config |

## License

The Expo source code is made available under the [MIT license](LICENSE). Some of the dependencies are licensed differently, with the BSD license, for example.

<!-- Footer -->

---

<p>
    <a aria-label="sponsored by expo" href="http://expo.dev">
        <img src="https://img.shields.io/badge/Sponsored_by-Expo-4630EB.svg?style=for-the-badge&logo=EXPO&labelColor=000&logoColor=fff" target="_blank" />
    </a>
    <a aria-label="expo pwa is free to use" href="/LICENSE" target="_blank">
        <img align="right" alt="License: MIT" src="https://img.shields.io/badge/License-MIT-success.svg?style=for-the-badge&color=33CC12" target="_blank" />
    </a>
</p>

[abp]: https://docs.expo.dev/workflow/configuration/#assetbundlepatterns
