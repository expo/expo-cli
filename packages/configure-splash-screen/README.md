# @expo/configure-splash-screen

This package provides CLI command that helps you configure [`expo-splash-screen`](https://github.com/expo/expo/tree/master/packages/expo-splash-screen) module.
You can use it to configure your native iOS and Android project according to your needs without opening Xcode or Android Studio.

## Content

- [📜 CHANGELOG](../../CHANGELOG.md)
- [🚀 Features](#-features)
- [🗒 Usage](#-usage)
- [🖥 Installation](#-installation)
- [👏 Contributing](#-contributing)

## 🚀 Features

### 📱 iOS

- Configures background color for native splash screen.
- Configures [`expo-splash-screen`](https://github.com/expo/expo/tree/master/packages/expo-splash-screen) to show given `.png` image.
- Supports [`CONTAIN`](https://github.com/expo/expo/tree/master/packages/expo-splash-screen#contain-resize-mode) and [`COVER`](https://github.com/expo/expo/tree/master/packages/expo-splash-screen#cover-resize-mode) modes from [`expo-splash-screen`](https://github.com/expo/expo/tree/master/packages/expo-splash-screen).
- Configures the `StatusBar`'s attributes:
  - `hiding`,
  - `style`.
- Supports separate SplashScreenView configuration for the dark mode.

### 🤖 Android

- Configures background color for native splash screen.
- Configures `expo-splash-screen` to show given `.png` image.
- Supports [`CONTAIN`](https://github.com/expo/expo/tree/master/packages/expo-splash-screen#contain-resize-mode), [`COVER`](https://github.com/expo/expo/tree/master/packages/expo-splash-screen#cover-resize-mode) and [`NATIVE`](https://github.com/expo/expo/tree/master/packages/expo-splash-screen#native-resize-mode) modes from [`expo-splash-screen`](https://github.com/expo/expo/tree/master/packages/expo-splash-screen).
- Configures the `StatusBar`'s attributes:
  - `hiding`,
  - `style`,
  - `backgroundColor`,
  - `translucency`.
- Supports separate SplashScreenView configuration for the dark mode.

## 🗒 Usage

Command syntax:

```
yarn run configure-splash-screen [options]
```

### Options:

- `-p, --platform <platform>` - Selected platform to configure. Available values: "android" | "ios" | "all" (default: "all").
- `-b, --background-color <color>` - (required) Valid css-formatted color (hex (#RRGGBB[AA]), rgb[a], hsl[a], named color (https://drafts.csswg.org/css-color/#named-colors)) that would be used as the background color for native splash screen view.
- `-i, --image-path <path>` - Path to valid .png image that will be displayed on the splash screen.
- `-r, --image-resize-mode <resizeMode>` - Resize mode to be used for the splash screen image. Available only if 'image-path' is provided as well. Available values: "contain" | "cover" | "native" ("native" is only available for Android)) (default: "contain"). See [resize modes](https://github.com/expo/expo/tree/master/packages/expo-splash-screen#built-in-splash-screen-image-resize-modes) for more information.
- `--dark-mode-background-color <color>` - Color (see 'background-color' supported formats) that would be used as the background color for the splash screen in dark mode. Providing this option enables other dark-mode related options.
- `--dark-mode-image-path <path>` - Path to valid .png image that will be displayed on the splash screen in dark mode only. Available only if 'dark-mode-background-color' is provided as well.
- `--status-bar-style <style>` - Customizes the color of the status bar icons. Available values: "default" | "light-content" | "dark-content" (default: "default").
- `--status-bar-hidden` - Hides the status bar.
- `--status-bar-background-color <color>` - (only for Android platform) Customizes the background color of the status bar. Accepts a valid color (see 'background-color' supported formats).
- `--status-bar-translucent` - (only for Android platform) Makes the status bar translucent (enables drawing under the status bar area).
- `--dark-mode-status-bar-style <style>` - (only for Android platform) The same as 'status-bar-style', but applied only in dark mode. Available only if 'dark-mode-background-color' and 'status-bar-style' are provided as well.
- `--dark-mode-status-bar-background-color <color>` - (only for Android platform) The same as 'status-bar-background-color', but applied only in the dark mode. Available only if 'dark-mode-background-color' and 'status-bar-style' are provided as well.

To see all the available options:

```
yarn run expo-splash-screen --help
```

## 🖥 Installation

This package is installed as a dependency of the [`expo-splash-screen`](https://github.com/expo/expo/tree/master/packages/expo-splash-screen) package. Follow the installation instructions provided by [`expo-splash-screen`](https://github.com/expo/expo/tree/master/packages/expo-splash-screen) package.

## 👏 Contributing

Contributions are very welcome! Please refer to guidelines described in the [contributing guide](https://github.com/expo/expo#contributing).
