# @expo/configure-splash-screen

This package provides CLI command that helps you configure [`expo-splash-screen`](https://github.com/expo/expo/tree/master/packages/expo-splash-screen) module.
You can use it to configure your native iOS and Android project according to your needs without opening Xcode or Android Studio.

## Content

- [📜 CHANGELOG](./CHANGELOG.md)
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

### 🤖 Android

- Configures background color for native splash screen.
- Configures `expo-splash-screen` to show given `.png` image.
- Supports [`CONTAIN`](https://github.com/expo/expo/tree/master/packages/expo-splash-screen#contain-resize-mode), [`COVER`](https://github.com/expo/expo/tree/master/packages/expo-splash-screen#cover-resize-mode) and [`NATIVE`](https://github.com/expo/expo/tree/master/packages/expo-splash-screen#native-resize-mode) modes from [`expo-splash-screen`](https://github.com/expo/expo/tree/master/packages/expo-splash-screen).
- Configures the `StatusBar`'s attributes:
  - `hiding`,
  - `style`,
  - `backgroundColor`,
  - `translucency`.

## 🗒 Usage

Command syntax:

```
yarn run configure-splash-screen [options] <backgroundColor> [imagePathOrDarkModeBackgroundColor] [imagePath] [darkModeImagePath]
```

### Arguments

- `backgroundColor` - (required) Valid css-formatted color (hex (#RRGGBB[AA]), rgb[a], hsl[a], named color (https://drafts.csswg.org/css-color/#named-colors)) that would be used as the background color for native splash screen view.
- `imagePathOrDarkModeBackgroundColor` - (optional) Path to a valid .png image or valid css-formatted color (see backgroundColor supported formats). When script detects that this argument is a path to a .png file, it assumes dark mode is not supported. Otherwise this argument is treated as a background color for native splash screen in dark mode.
- `imagePath` - (optional) Path to valid .png image that will be displayed in native splash screen. This argument is available only if dark mode support is detected.
- `darkModeImagePath` - (optional) Path to valid .png image that will be displayed in native splash screen in dark mode only. If this argument is not specified then image from imagePath will be used in dark mode as well. This argument is available only if dark mode support is detected.

### Options:

- `-r, --resize-mode [resizeMode]` - ResizeMode to be used for native splash screen image. Available values: "contain" | "cover" | "native" (only available for android platform)) (default: "contain"). See [resize modes](https://github.com/expo/expo/tree/master/packages/expo-splash-screen#built-in-splash-screen-image-resize-modes) for more information.
- `-p, --platform [platform]` - Selected platform to configure. Available values: "android" | "ios" | "all". (default: "all")
- `--statusbar-style [statusBarStyle]` - Customizes the color of the StatusBar icons. Available values: "default" | "light-content" | "dark-content". (default: "default")
- `--dark-mode-statusbar-style [darkModeStatusBarStyle]` - (only for Android platform) The very same as 'statusbar-style' option, but applied only in dark mode. Available only if 'statusbar-style' is provided.
- `--statusbar-hidden` - Hides the StatusBar.
- `--statusbar-background-color [statusBarBackgroundColor]` - (only for Android platform) Customizes the background color of the StatusBar. Valid css-formatted color (see backgroundColor supported formats).
- `--dark-mode-statusbar-background-color [darkModeStatusBarBackgroundColor]` - (only for Android platform) The very same as 'statusbar-background-color' option, but applied only in dark mode. Available only if `statusbar-style` is provided.
- `--statusbar-translucent` - (only for Android platform) Makes the StatusBar translucent (enables drawing under the StatusBar area).

To see all the available options:

```
yarn run expo-splash-screen --help
```

## 🖥 Installation

This package is installed as a dependency of the [`expo-splash-screen`](https://github.com/expo/expo/tree/master/packages/expo-splash-screen) package. Follow the installation instructions provided by [`expo-splash-screen`](https://github.com/expo/expo/tree/master/packages/expo-splash-screen) package.

## 👏 Contributing

Contributions are very welcome! Please refer to guidelines described in the [contributing guide](https://github.com/expo/expo#contributing).
