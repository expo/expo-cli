# Changelog

This is the log of notable changes to Expo CLI and related packages.

## master

### 🛠 Breaking changes

### 🎉 New features

### 🐛 Bug fixes

## [Thu Apr 30 18:45:00 2020 +0300](https://github.com/expo/expo-cli/commit/efa712a70ce470714129af085ff746eb7e4e323d)

### 🐛 Bug fixes

- Resolve and import metro-config from the project ([#2048](https://github.com/expo/expo-cli/pull/2048) by [@fson](https://github.com/fson)).
- Remove excessive warnings when session is logged out. ([#2053](https://github.com/expo/expo-cli/pull/2053) by [@jkhales](https://github.ciom/jkhales)).

  - @expo/dev-server@0.1.1
  - @expo/dev-tools@0.13.4
  - expo-cli@3.20.1
  - @expo/metro-config@0.1.1
  - @expo/xdl@57.9.1

## [Thu Apr 30 00:23:03 2020 +0300](https://github.com/expo/expo-cli/commit/945feb8b8f7228420e3b7e7918635721f81697f6)

- @expo/babel-preset-cli@0.2.11
- @expo/config@3.2.0
- @expo/dev-server@0.1.0
- @expo/dev-tools@0.13.3
- @expo/electron-adapter@0.0.0-alpha.51
- expo-cli@3.20.0
- expo-codemod@1.0.21
- expo-optimize@0.1.23
- @expo/image-utils@0.2.22
- @expo/json-file@8.2.13
- @expo/metro-config@0.1.0
- @expo/next-adapter@2.1.3
- @expo/osascript@2.0.16
- @expo/package-manager@0.0.18
- pod-install@0.0.0-alpha.13
- expo-pwa@0.0.11
- @expo/schemer@1.3.12
- uri-scheme@1.0.8
- @expo/webpack-config@0.12.3
- @expo/xdl@57.9.0

### 🛠 Breaking changes

- Remove `exp.json` support. Before this, `exp.json` had already been deprecated in favor of [`app.json` or `app.config.js`](https://docs.expo.io/workflow/configuration/). ([#2017](https://github.com/expo/expo-cli/pull/2017) by [@EvanBacon](https://github.com/EvanBacon)).

### 🎉 New features

- Suggest closest match to an unknown command . ([#2007](https://github.com/expo/expo-cli/pull/2007) by [@jamesgeorge007](jamesgeorge007)).
- Add validation for the `--platform` option in `expo apply`. ([#1981](https://github.com/expo/expo-cli/pull/1981) by [@EvanBacon](https://github.com/EvanBacon)).
- Print warning when running on untested newer versions of Node.js ([#1992](https://github.com/expo/expo-cli/pull/1992) by [@LinusU](https://github.com/LinusU))
- Clean up `Expo.plist` artifacts left behind by `expo publish` in a bare project. ([#2028](https://github.com/expo/expo-cli/pull/2028) by [@esamelson](https://github.com/esamelson))
- _Experimental_: add `@expo/dev-server`, a complete rewrite of the development server using Metro and `@react-native-community/cli-server-api`. The experimental dev server can be enabled in SDK 37 projects by setting `EXPO_USE_DEV_SERVER=true` in the environment. ([#1845](https://github.com/expo/expo-cli/pull/1845) by [@fson](https://github.com/fson))

### 🐛 Bug fixes

- Add necessary imports for onConfigurationChanged updates to MainActivity when ejecting. ([#2001](https://github.com/expo/expo-cli/pull/2001) by [@brentvatne](https://github.com/brentvatne)).
- Revert `workbox-webpack-plugin` update ([#2023](https://github.com/expo/expo-cli/pull/2023) by [@EvanBacon](https://github.com/EvanBacon)).

### 💎 Enhancements

- Improve macOS comment in `expo init` ([#2042](https://github.com/expo/expo-cli/issues/2042) by [@Anders-E](https://github.com/Anders-E))
- Add a better default email address in `expo client:ios`. ([#2029](https://github.com/expo/expo-cli/pull/2029) by [@EvanBacon](https://github.com/EvanBacon)).
- Update `expo whoami` and `expo logout` text ([#2019](https://github.com/expo/expo-cli/pull/2019) by [@EvanBacon](https://github.com/EvanBacon)).
- Fix typo in build output. ([#2006](https://github.com/expo/expo-cli/pull/2006) by [@BrodaNoel](https://github.com/BrodaNoel)).

### 🤷‍♂️ Chores

- Test `expo build:ios`. ([#1991](https://github.com/expo/expo-cli/pull/1991) and [#2011](https://github.com/expo/expo-cli/pull/2011) by [@quinlanj](https://github.com/quinlanj)).
- Improve readability of `asyncActionProjectDir`. ([#1989](https://github.com/expo/expo-cli/pull/1989) by [@EvanBacon](https://github.com/EvanBacon) and [@brentvatne](https://github.com/brentvatne)).
- Fetch configuration schemas from APIv2 endpoint. ([#1978](https://github.com/expo/expo-cli/pull/1978) by [@jkhales](https://github.com/jkhales)).
- Migrate to `cli-table3`. ([#2024](https://github.com/expo/expo-cli/pull/2024) by [@jamesgeorge007](https://github.com/jamesgeorge007)).
- Add docs for `uri-scheme`. ([#2026](https://github.com/expo/expo-cli/pull/2026) by [@EvanBacon](https://github.com/EvanBacon)).
- Use comments in the issue template. ([#2027](https://github.com/expo/expo-cli/pull/2027) by [@EvanBacon](https://github.com/EvanBacon)).
- Update `treekill`. ([#2027](https://github.com/expo/expo-cli/issues/2004) by [@brentvatne]).
- Remove `jest-message-utils` ([#2033](https://github.com/expo/expo-cli/issues/2033) by [@EvanBacon](https://github.com/EvanBacon)
- Make clean scripts platform independent ([#2043](https://github.com/expo/expo-cli/issues/2043) by [@Anders-E](https://github.com/Anders-E))

## [Sat Apr 25 16:26:28 2020 -0700](https://github.com/expo/expo-cli/commit/8a805d)

- @expo/babel-preset-cli@0.2.10
- @expo/config@3.1.4
- @expo/dev-tools@0.13.2
- @expo/electron-adapter@0.0.0-alpha.50
- expo-cli@3.19.2
- expo-codemod@1.0.20
- expo-optimize@0.1.22
- @expo/image-utils@0.2.21
- @expo/json-file@8.2.12
- @expo/metro-config@0.0.9
- @expo/next-adapter@2.1.2
- @expo/osascript@2.0.15
- @expo/package-manager@0.0.17
- pod-install@0.0.0-alpha.12
- expo-pwa@0.0.10
- @expo/schemer@1.3.11
- uri-scheme@1.0.7
- @expo/webpack-config@0.12.2
- @expo/xdl@57.8.32

### 🛠 Breaking changes

- Deprecate `expo ios` in favor of `expo start --ios` or pressing `i` in the terminal UI after running `expo start`. ([#1987](https://github.com/expo/expo-cli/pull/1987) by [@evanbacon](https://github.com/evanbacon))
- Deprecate `expo android` in favor of `expo start --android` or pressing `a` in the terminal UI after running `expo start`. ([#1987](https://github.com/expo/expo-cli/pull/1987) by [@evanbacon](https://github.com/evanbacon))

### 🐛 Bug fixes

- Fix bundling assets in bare apps that are using `expo-updates` and `expo export` for self hosting. ([#1999](https://github.com/expo/expo-cli/pull/1999) by [@brentvatne](https://github.com/brentvatne)).
- Use UIStatusBarStyleDefault in standalone apps unless otherwise specified. This fixes a longstanding issue where the status bar style is different between Expo client and standalone apps (https://github.com/expo/expo-cli/commit/474a56e863a16228a641c58f31f3f5c9f3c2d9e8 by [@brentvatne](https://github.com/brentvatne)).
- Fix support for owner field when checking credentials. ([#1942](https://github.com/expo/expo-cli/pull/1941) by [@quinlanj](https://github.com/quinlanj)).

### 🤷‍♂️ Chores

- Add notice about "damage simulator builds" on macOS Catalina (#[1944](https://github.com/expo/expo-cli/pull/1944) by [@byCedric](https://github.com/byCedric)).
- Better build errors when credentials aren't available in non-interactive mode ([#1928](https://github.com/expo/expo-cli/pull/1928) by [@quinlanj](https://github.com/quinlanj)).

## [Wed Apr 22 19:05:40 2020 -0700](https://github.com/expo/expo-cli/commit/3a0e79)

- @expo/babel-preset-cli@0.2.9
- @expo/config@3.1.3
- @expo/dev-tools@0.13.1
- @expo/electron-adapter@0.0.0-alpha.49
- expo-cli@3.19.1
- expo-codemod@1.0.19
- expo-optimize@0.1.21
- @expo/image-utils@0.2.20
- @expo/json-file@8.2.11
- @expo/metro-config@0.0.8
- @expo/next-adapter@2.1.1
- @expo/osascript@2.0.14
- @expo/package-manager@0.0.16
- @expo/plist@0.0.4
- pod-install@0.0.0-alpha.11
- expo-pwa@0.0.9
- @expo/schemer@1.3.10
- uri-scheme@1.0.6
- @expo/webpack-config@0.12.1
- @expo/xdl@57.8.31

### 🐛 Bug fixes

- Fix pasting service account JSON from finder (#1943)
- Add back sharp-cli version check back (#1907).
- Fix the open editor hotkey on Mac with osascript (#1899)
- Fix semver comparison in Node version compatibility check so an appropriate error is provided when using a Node version that is new and not yet supported.

### 🤷‍♂️ Chores

- Ignore mocks and tests in TypeScript builds (#1965)
- Remove the optimize command from expo-cli (#1930)
- Assorted improvements to build, testing, and coverage infra.

## [Tue Apr 21 10:52:42 2020 +0200](https://github.com/expo/expo-cli/commit/771a53)

- @expo/dev-tools@0.13.0
- @expo/electron-adapter@0.0.0-alpha.48
- expo-cli@3.19.0
- @expo/next-adapter@2.1.0
- @expo/webpack-config@0.12.0
- @expo/xdl@57.8.30

### 🐛 Bug fixes

- Assemble/bundle only the :app project on turtle (https://github.com/expo/expo-cli/pull/1937).

### 🤷‍♂️ Chores

- Added default name for projects if no name is given (#1923)
- Log message in `expo bundle-assets` if manifest is empty (#1912)
- Fallback on insecure HTTPS (#1940)

## [Mon Apr 20 14:52:56 2020 +0200](https://github.com/expo/expo-cli/commit/771a53)

- @expo/dev-tools@0.12.6
- expo-cli@3.18.7
- @expo/xdl@57.8.29

### 🤷‍♂️ Chores

- Remove call to check-dynamic-macros (https://github.com/expo/expo-cli/pull/1933).

## [Sat Apr 18 17:58:21 2020 -0700](https://github.com/expo/expo-cli/commit/4e6cfd)

- @expo/dev-tools@0.12.4
- @expo/electron-adapter@0.0.0-alpha.46
- expo-cli@3.18.5
- @expo/next-adapter@2.0.32
- expo-pwa@0.0.7
- uri-scheme@1.0.4
- @expo/webpack-config@0.11.24
- @expo/xdl@57.8.27

### 🐛 Bug fixes

- `expo start -c` will now properly clear cache as expected (https://github.com/expo/expo-cli/commit/48d67f).
- Fix keystore uploading with apiv2 (https://github.com/expo/expo-cli/commit/9fd163).

### 🤷‍♂️ Chores

- Create initial commit for project (https://github.com/expo/expo-cli/commit/22017c).
- Add useful information in uri-scheme when user does not have launchMode singleTask set (https://github.com/expo/expo-cli/commit/15899b).
- Support custom paths in uri-scheme (https://github.com/expo/expo-cli/commit/4d2dd7).

## [Fri Apr 17 11:20:10 2020 -0700](https://github.com/expo/expo-cli/commit/465333)

- @expo/dev-tools@0.12.3
- expo-cli@3.18.4
- @expo/xdl@57.8.26

### 🐛 Bug fixes

- Fix typo that was causing android keystore updates to fail (https://github.com/expo/expo-cli/pull/1909).

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
