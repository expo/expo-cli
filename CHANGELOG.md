# Changelog

This is the log of notable changes to Expo CLI and related packages.

## master

### 🛠 Breaking changes

### 🎉 New features

### 🐛 Bug fixes

### 🤷‍♂️ Chores

## [Fri Apr 17 10:02:10 2020 +0200](https://github.com/expo/expo-cli/commit/850be0)

- @expo/dev-tools@0.12.2
- expo-cli@3.18.3
- @expo/xdl@57.8.25

### 🐛 Bug fixes 

- Do not override `google-services.json` contents since SDK 37 (https://github.com/expo/expo-cli/pull/1897).

## [Wed Apr 15 22:08:42 2020 -0700](https://github.com/expo/expo-cli/commit/c4eec5) and [Wed Apr 15 21:58:50 2020 -0700](https://github.com/expo/expo-cli/commit/c614c0)

- @expo/config@3.1.1
- @expo/dev-tools@0.12.1
- @expo/electron-adapter@0.0.0-alpha.45
- expo-cli@3.18.2
- expo-optimize@0.1.19
- @expo/metro-config@0.0.6
- @expo/next-adapter@2.0.31
- @expo/package-manager@0.0.14
- pod-install@0.0.0-alpha.9
- expo-pwa@0.0.6
- uri-scheme@1.0.3
- @expo/webpack-config@0.11.23
- @expo/xdl@57.8.24

### 🎉 New features

- Add offline support to Yarn PackageManager (https://github.com/expo/expo-cli/pull/1892).
- Return the given entry point as-is if it cannot be resolved using our helpers - this makes it easier to use `expo-updates` in certain monorepo setups (https://github.com/expo/expo-cli/commit/e076d56).

### 🐛 Bug fixes

- Temporarily revert build credentials to apiv1 in order to resolve issue with `owner` field not being respected on build (https://github.com/expo/expo-cli/commit/3b2f680).
- Handle Ctrl+C correctly in PowerShell/CMD (https://github.com/expo/expo-cli/pull/1749).

### 🤷‍♂️ Chores

- Better contextual error when a non-interactive build fails in a way that we cannot recover from without user intervention (https://github.com/expo/expo-cli/pull/1891).
- Better support for non-interactive mode in build - auto-select credentials when possible (https://github.com/expo/expo-cli/commit/c94638e).


## [Tue Apr 14 17:47:28 2020 -0700](https://github.com/expo/expo-cli/commit/5bc8404a0d03e0b419ba535501ea07927196ef6a)

### 📦 Packages updated

- @expo/config@3.1.0
- @expo/dev-tools@0.11.0
- @expo/electron-adapter@0.0.0-alpha.44
- expo-cli@3.18.0
- expo-optimize@0.1.18
- @expo/image-utils@0.2.19
- @expo/json-file@8.2.9
- @expo/metro-config@0.0.5
- @expo/next-adapter@2.0.30
- expo-pwa@0.0.5
- uri-scheme@1.0.2
- @expo/webpack-config@0.11.22
- @expo/xdl@57.8.22

### 🛠 Breaking changes

- `expo publish:rollback` now works more like what developers would intuitively expect - users who have already downloaded the bundle that is rolled back will also get rolled back (https://github.com/expo/expo-cli/pull/1707).

### 🎉 New features

- Explain to users on init of bare projects and eject that publishing is needed before creating a release build (https://github.com/expo/expo-cli/commit/3eb9e7ef50214394cca30869a031b384942d3d95).
- Created the `uri-scheme` package to easily interact with schemes on bare projects and test deep linking (https://github.com/expo/expo-cli/commit/3eb9e7ef50214394cca30869a031b384942d3d95).
- `expo build:ios` and `expo build:android` now prompt you to pick a build type in order to make the options more discoverable (https://github.com/expo/expo-cli/pull/1479).
- Added a shortcut to open your editor via expo-cli with the `o` hotkey (https://github.com/expo/expo-cli/pull/1879).

### 🐛 Bug fixes

- Fix Android scheme configuration that is applied on eject (https://github.com/expo/expo/issues/7816).
- Stop adb on Windows when shutting down expo-cli server (https://github.com/expo/expo-cli/pull/1876).
- Always properly terminate the bundle progress bar when completed (https://github.com/expo/expo-cli/pull/1877).

### 🤷‍♂️ Chores

- Replace request with axios due to deprecation of the request package and the mountain of warnings it produces (https://github.com/expo/expo-cli/pull/1809).
- Remove bootstrap from yarn start in the packages directory so it's quicker for collaborators working on expo-cli to get started (https://github.com/expo/expo-cli/pull/1869).
