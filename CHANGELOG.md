# Changelog

This is the log of notable changes to Expo CLI and related packages.

## master

### 🛠 Breaking changes

### 🎉 New features

- [xdl] Log output from Gradle Wrapper is a lot cleaner now. It doesn't print dots when the appropriate Gradle version is being downloaded ([#2355](https://github.com/expo/expo-cli/pull/2355)).
- [expo-cli] expo upload:android - Add better error messages when downloading archive file failed [#2384](https://github.com/expo/expo-cli/pull/2384).

### 🐛 Bug fixes

- [xdl] Fix incorrect check of the packager port in the "setOptionsAsync" function [#2270](https://github.com/expo/expo-cli/issues/2270)
- [expo-cli] expo upload:android - Fix passing archive type from command line [#2383](https://github.com/expo/expo-cli/pull/2383)
- [expo-cli] check `when` field when inquirer is used in noninteractive mode [#2393](https://github.com/expo/expo-cli/pull/2393)

### 📦 Packages updated

## [Wed Jul 15 2020 05:42:45 GMT-0700](https://github.com/expo/expo-cli/commit/05a88e6a69a1c0ab78dcb9a523a35b4bba26c694)

### 🛠 Breaking changes

- [expo-cli] Prefer `--apple-id-password` flag to environment variable `EXPO_APPLE_PASSWORD` when both are set([#2280](https://github.com/expo/expo-cli/issues/2280)).
- [expo-cli] Use `EXPO_APPLE_PASSWORD` instead of `EXPO_APPLE_ID_PASSWORD`.

## [Tue, 14 Jul 2020 21:37:53 -0700](https://github.com/expo/expo-cli/commit/2607c01f75eae079dd7ce4a8295cc7f47921096c)

### 🐛 Bug fixes

- [xdl] fix analytics for expo start ([#2357](https://github.com/expo/expo-cli/issues/2357))
- [xdl] Update link to third party library docs

### 📦 Packages updated

- @expo/dev-tools@0.13.27
- expo-cli@3.22.3
- @expo/xdl@57.9.24

## [Thu, 9 Jul 2020 13:45:20 -0700](https://github.com/expo/expo-cli/commit/30981cf510b4f72b365751ca4d83f43ed13a6cdc)

### 🐛 Bug fixes

- [webpack-config] Interop assets like Metro bundler ([#2346](https://github.com/expo/expo-cli/issues/2346))

### 📦 Packages updated

- @expo/dev-tools@0.13.25
- @expo/electron-adapter@0.0.6
- expo-cli@3.22.1
- @expo/next-adapter@2.1.19
- @expo/webpack-config@0.12.19
- @expo/xdl@57.9.22

## [Tue, 7 Jul 2020 11:39:19 -0700](https://github.com/expo/expo-cli/commit/e6de6aae5c90f006bff7b89e55cd702103a177e8)

### 🎉 New features

- [expo-cli] print turtle v2 build logs url
- [cli] add owner support for push:android cmds ([#2330](https://github.com/expo/expo-cli/issues/2330))
- [expo-cli] give another attempt to enter apple id credentials if it fails authentication with Apple ([#2338](https://github.com/expo/expo-cli/issues/2338))
- Add owner field support to expo start ([#2329](https://github.com/expo/expo-cli/issues/2329))
- Updated webpack version ([#2336](https://github.com/expo/expo-cli/issues/2336))
- [expo-cli] implement webhooks v2 ([#2212](https://github.com/expo/expo-cli/issues/2212))
- Add e2e tests for `expo export` ([#2237](https://github.com/expo/expo-cli/issues/2237))
- [expo-cli] Combined ID prompts for build and eject ([#2313](https://github.com/expo/expo-cli/issues/2313))
- Upgraded copy-webpack-plugin ([#2334](https://github.com/expo/expo-cli/issues/2334))

### 🐛 Bug fixes

- fix(config): use basename to avoid mixed path separators from glob ([#2319](https://github.com/expo/expo-cli/issues/2319))
- [webpack-config] Remove yup validation ([#2335](https://github.com/expo/expo-cli/issues/2335))

### 📦 Packages updated

- @expo/config@3.2.15
- @expo/dev-server@0.1.16
- @expo/dev-tools@0.13.24
- @expo/electron-adapter@0.0.5
- expo-cli@3.22.0
- expo-optimize@0.1.38
- @expo/metro-config@0.1.16
- @expo/next-adapter@2.1.18
- expo-pwa@0.0.26
- uri-scheme@1.0.23
- @expo/webpack-config@0.12.18
- @expo/xdl@57.9.21

## [Fri Jun 26 11:37:33 2020 -0700](https://github.com/expo/expo-cli/commit/8a9d17f699c07747c8198d5670eb779006e9b961)

### 🐛 Bug fixes

- Fix bug in credential manager when the user specifies a push key manually and appleCtx is not intialized.
- Simplify findProjectRootAsync to not use getConfig and swallow its errors.
- Workaround for iOS eject entitlements step failing on Windows - try/catch and warn if it doesn't work.

### 📦 Packages updated

- expo-cli@3.21.13

## [Thu Jun 25 14:51:58 2020 -0700](https://github.com/expo/expo-cli/commit/9fcad4c28b250bcf5a7a8c3f91ef79c1420cdeee)

### 🐛 Bug fixes

- Fix `expo upgrade` in projects that use dynamic configuration

### 📦 Packages updated

- @expo/dev-tools@0.13.23
- expo-cli@3.21.12
- @expo/xdl@57.9.20

## [Thu Jun 25 13:06:44 2020 -0700](https://github.com/expo/expo-cli/commit/8a03a18faa1af8711947698bba94c227f6ece5ec)

### 🛠 Breaking changes

- Mark unused XDL functions as deprecated

### 🎉 New features

- Prompt for iOS bundle identifier on build
- Add allowBackup customization feature for android
- Make the tabs template use TypeScript
- Use sudo for CocoaPods installation in pod-install, as recommended by CocoaPods docs

### 🐛 Bug fixes

- Fix `expo credentials:manager` listing all credentials on android and respect owner field` ([#2311](https://github.com/expo/expo-cli/pull/2311) by [@wkozyra95](https://github.com/wkozyra95)).
- Fix client_log warning in SDK 38 apps

### 📦 Packages updated

- @expo/config@3.2.14
- @expo/dev-server@0.1.15
- @expo/dev-tools@0.13.22
- @expo/electron-adapter@0.0.4
- expo-cli@3.21.11
- expo-optimize@0.1.37
- @expo/metro-config@0.1.15
- @expo/next-adapter@2.1.17
- @expo/package-manager@0.0.29
- pod-install@0.1.8
- expo-pwa@0.0.25
- uri-scheme@1.0.22
- @expo/webpack-config@0.12.17
- @expo/xdl@57.9.19

## [Tue Jun 23 17:55:00 2020 -0700](https://github.com/expo/expo-cli/commit/4bc73721d5a46fcac35096a0e86a1ceaa333b459)

### 🎉 New features

- Configure expo-updates on expo init in bare projects.

### 🐛 Bug fixes

- Add ttf and otf to binary extensions to fix font in tabs project.
- Upgrade fastlane.
- Replace calls to /bin/cp and /bin/rm with their xplat equivalents in fs-extra in xdl's IosPlist.

### 📦 Packages updated

- @expo/config@3.2.13
- @expo/dev-server@0.1.14
- @expo/dev-tools@0.13.21
- @expo/electron-adapter@0.0.3
- expo-cli@3.21.10
- expo-optimize@0.1.36
- @expo/metro-config@0.1.14
- @expo/next-adapter@2.1.16
- expo-pwa@0.0.24
- uri-scheme@1.0.21
- @expo/webpack-config@0.12.16
- @expo/xdl@57.9.18

## [Fri Jun 19 11:46:02 2020 -0700](https://github.com/expo/expo-cli/commit/d983fade1414f674c7dfff1c853d3e82fd787207)

### 🎉 New features

- `expo install` now also uses `bundledNativeModules.json` on bare projects.

### 📦 Packages updated

- @expo/dev-tools@0.13.20
- expo-cli@3.21.9
- @expo/xdl@57.9.17

## [Fri Jun 19 10:36:25 2020 +0200](https://github.com/expo/expo-cli/commit/4bc7d72f46f33349a974bfb38f1ee325297a2c16)

### 🎉 New features

- `expo upload:android --use-submission-service` is now ensuring the project is registered on Expo Servers before submitting a build.

### 📦 Packages updated

- @expo/config@3.2.12
- @expo/dev-server@0.1.13
- @expo/dev-tools@0.13.19
- @expo/electron-adapter@0.0.2
- expo-cli@3.21.8
- expo-optimize@0.1.35
- @expo/metro-config@0.1.13
- @expo/next-adapter@2.1.15
- expo-pwa@0.0.23
- uri-scheme@1.0.20
- @expo/webpack-config@0.12.15
- @expo/xdl@57.9.16

## [Thu Jun 18 11:13:34 2020 +0300](https://github.com/expo/expo-cli/commit/d868f8e4340f40a39f8e3a0d3b0c63f0ed116544)

### 🎉 New features

- Add `EXPO_IMAGE_UTILS_NO_SHARP` environment variable: it can be used to disable `sharp-cli` for image processing. ([#2269](https://github.com/expo/expo-cli/pull/2269) by [@EvanBacon](https://github.com/EvanBacon)).

### 🐛 Bug fixes

- Fix `expo build:android` throwing `_joi(...).default.strict is not a function` ([#2277](https://github.com/expo/expo-cli/issues/2277) by [@byCedric](https://github.com/byCedric)).
- Replace `newestSdkVersionAsync` with `newestReleasedSdkVersionAsync` ([#2266](https://github.com/expo/expo-cli/pull/2266) by [@cruzach](https://github.com/cruzach)).
- Use default `splash.resizeMode` on web ([#2268](https://github.com/expo/expo-cli/pull/2268) by [@EvanBacon](https://github.com/EvanBacon)).

### 📦 Packages updated

- @expo/config@3.2.11
- @expo/dev-server@0.1.12
- @expo/dev-tools@0.13.18
- @expo/electron-adapter@0.0.1
- expo-cli@3.21.7
- expo-optimize@0.1.34
- @expo/image-utils@0.3.0
- @expo/metro-config@0.1.12
- @expo/next-adapter@2.1.14
- expo-pwa@0.0.22
- uri-scheme@1.0.19
- @expo/webpack-config@0.12.14
- @expo/xdl@57.9.15

## [Mon Jun 15 14:40:35 2020 +0200](https://github.com/expo/expo-cli/commit/6b4992ca3bc4e23d32c5fc95110d3750c54dedfe)

### 🛠 Breaking changes

- Remove `opt-in-google-play-signing` command ([#2247](https://github.com/expo/expo-cli/pull/2247) by [@wkozyra95](https://github.com/wkozyra95)).
- Drop support for Node.js 13.x.x and 12.0.0-12.13.0 ([#2219](https://github.com/expo/expo-cli/pull/2219) by [@fson](https://github.com/fson)).

### 🎉 New features

- Allow providing a `postExport` hook ([#2227](https://github.com/expo/expo-cli/pull/2227) by [@vernondegoede](https://github.com/vernondegoede)).

### 🐛 Bug fixes

- Set EXPO_TARGET to correct value when starting dev server ([#2250](https://github.com/expo/expo-cli/pull/2250) by [esamelson](https://github.com/esamelson)).

### 📦 Packages updated

- @expo/config@3.2.10
- @expo/configure-splash-screen@0.1.12
- @expo/dev-server@0.1.11
- @expo/dev-tools@0.13.17
- @expo/electron-adapter@0.0.0
- expo-cli@3.21.6
- expo-optimize@0.1.33
- @expo/metro-config@0.1.11
- @expo/next-adapter@2.1.13
- @expo/package-manager@0.0.28
- pod-install@0.1.7
- expo-pwa@0.0.21
- uri-scheme@1.0.18
- @expo/webpack-config@0.12.13
- @expo/xdl@57.9.14

## [Thu Jun 4 10:01:50 2020 +0200](https://github.com/expo/expo-cli/commit/eb8409e9e18ea9c208a79f998596469b40145ca7)

### 🐛 Bug fixes

- Fix behavior of the `--skip-credentials-check` flag for `expo build:ios` ([#2213](https://github.com/expo/expo-cli/pull/2213) by [@quinlanj](https://github.com/quinlanj)).
- Fix buggy import of the `md5-file` package - caused issues with uploading submissions to AWS S3 - ([https://github.com/expo/expo-cli/commit/f875c67e1eb1614031715a9a645a8516e467f620](https://github.com/expo/expo-cli/commit/f875c67e1eb1614031715a9a645a8516e467f620) by [@dsokal](https://github.com/dsokal)).

### 📦 Packages updated

- expo-cli@3.21.5

## [Tue Jun 2 13:03:08 2020 +0200](https://github.com/expo/expo-cli/commit/39a705ade41e7fd6807ab05288ddeab7ca17138d)

### 📦 Packages updated

- @expo/config@3.2.9
- @expo/configure-splash-screen@0.1.10
- @expo/dev-server@0.1.10
- @expo/dev-tools@0.13.16
- @expo/electron-adapter@0.0.0-alpha.60
- expo-cli@3.21.4
- expo-optimize@0.1.32
- @expo/image-utils@0.2.29
- @expo/json-file@8.2.21
- @expo/metro-config@0.1.10
- @expo/next-adapter@2.1.12
- @expo/package-manager@0.0.27
- pod-install@0.1.6
- expo-pwa@0.0.20
- uri-scheme@1.0.17
- @expo/webpack-config@0.12.12
- @expo/xdl@57.9.13

## [Wed May 27 15:42:30 2020 +0300](https://github.com/expo/expo-cli/commit/eaff0bcc27a4a1221e54c453d98a0691af23792c)

### 📦 Packages updated

- @expo/configure-splash-screen@0.1.9
- @expo/dev-tools@0.13.15
- expo-cli@3.21.3
- @expo/xdl@57.9.12

## [Wed May 27 14:40:55 2020 +0300](https://github.com/expo/expo-cli/commit/e5c0a33bc95b222f9df36b5ba97061ddfe539555)

### 📦 Packages updated

- @expo/config@3.2.8
- @expo/dev-server@0.1.9
- @expo/dev-tools@0.13.14
- @expo/electron-adapter@0.0.0-alpha.59
- expo-cli@3.21.2
- expo-codemod@1.0.27
- expo-optimize@0.1.31
- @expo/json-file@8.2.20
- @expo/metro-config@0.1.9
- @expo/next-adapter@2.1.11
- @expo/package-manager@0.0.26
- pod-install@0.1.5
- expo-pwa@0.0.19
- @expo/schemer@1.3.19
- uri-scheme@1.0.16
- @expo/webpack-config@0.12.11
- @expo/xdl@57.9.11

## [Tue May 26 15:46:04 2020 +0200](https://github.com/expo/expo-cli/commit/f115be93ed1054bc09bdd8d2a4b4d6dfb6bf4e17)

### 📦 Packages updated

- expo-cli@3.21.1

## [Tue May 26 14:12:57 2020 +0200](https://github.com/expo/expo-cli/commit/ed5afaafe5388d5d6b6ae02cdf5c9984bae4bea0)

### 📦 Packages updated

- @expo/babel-preset-cli@0.2.16
- @expo/config@3.2.7
- @expo/configure-splash-screen@0.1.8
- @expo/dev-server@0.1.8
- @expo/dev-tools@0.13.13
- @expo/electron-adapter@0.0.0-alpha.58
- expo-cli@3.21.0
- expo-codemod@1.0.26
- expo-optimize@0.1.30
- @expo/image-utils@0.2.28
- @expo/json-file@8.2.19
- @expo/metro-config@0.1.8
- @expo/next-adapter@2.1.10
- @expo/osascript@2.0.22
- @expo/package-manager@0.0.25
- @expo/plist@0.0.8
- pod-install@0.1.4
- expo-pwa@0.0.18
- @expo/schemer@1.3.18
- uri-scheme@1.0.15
- @expo/webpack-config@0.12.10
- @expo/xdl@57.9.10

## [Fri May 15 16:55:55 2020 -0700](https://github.com/expo/expo-cli/commit/b17349f344e165f5ee386f07bae110d73eafefac)

### 📦 Packages updated

- @expo/dev-tools@0.13.12
- expo-cli@3.20.9
- @expo/xdl@57.9.9

## [Fri May 15 12:26:08 2020 -0700](https://github.com/expo/expo-cli/commit/03aa7e0f4ab2f53a29a540a58a7d3efda475eaca)

### 📦 Packages updated

- @expo/babel-preset-cli@0.2.15
- @expo/config@3.2.6
- @expo/configure-splash-screen@0.1.7
- @expo/dev-server@0.1.7
- @expo/dev-tools@0.13.11
- @expo/electron-adapter@0.0.0-alpha.57
- expo-cli@3.20.8
- expo-codemod@1.0.25
- expo-optimize@0.1.29
- @expo/image-utils@0.2.27
- @expo/json-file@8.2.18
- @expo/metro-config@0.1.7
- @expo/next-adapter@2.1.9
- @expo/osascript@2.0.21
- @expo/package-manager@0.0.24
- @expo/plist@0.0.7
- pod-install@0.1.3
- expo-pwa@0.0.17
- @expo/schemer@1.3.17
- uri-scheme@1.0.14
- @expo/webpack-config@0.12.9
- @expo/xdl@57.9.8

## [Thu May 14 22:34:45 2020 -0700](https://github.com/expo/expo-cli/commit/21770d9b7da6e591643be6bc52634a6232b5bea4)

### 📦 Packages updated

- @expo/babel-preset-cli@0.2.14
- @expo/config@3.2.5
- @expo/configure-splash-screen@0.1.6
- @expo/dev-server@0.1.6
- @expo/dev-tools@0.13.10
- @expo/electron-adapter@0.0.0-alpha.56
- expo-cli@3.20.7
- expo-codemod@1.0.24
- expo-optimize@0.1.28
- @expo/image-utils@0.2.26
- @expo/json-file@8.2.17
- @expo/metro-config@0.1.6
- @expo/next-adapter@2.1.8
- @expo/osascript@2.0.20
- @expo/package-manager@0.0.23
- @expo/plist@0.0.6
- pod-install@0.1.2
- expo-pwa@0.0.16
- @expo/schemer@1.3.16
- uri-scheme@1.0.13
- @expo/webpack-config@0.12.8
- @expo/xdl@57.9.7

## [Thu May 14 18:36:58 2020 -0700](https://github.com/expo/expo-cli/commit/ae467cf329a73dbec1e607f6b2a4f9fce5aa63db)

### 📦 Packages updated

- @expo/config@3.2.4
- @expo/configure-splash-screen@0.1.5
- @expo/dev-server@0.1.5
- @expo/dev-tools@0.13.9
- @expo/electron-adapter@0.0.0-alpha.55
- expo-cli@3.20.6
- expo-optimize@0.1.27
- @expo/image-utils@0.2.25
- @expo/json-file@8.2.16
- @expo/metro-config@0.1.5
- @expo/next-adapter@2.1.7
- @expo/osascript@2.0.19
- @expo/package-manager@0.0.22
- @expo/plist@0.0.5
- pod-install@0.1.1
- expo-pwa@0.0.15
- @expo/schemer@1.3.15
- uri-scheme@1.0.12
- @expo/webpack-config@0.12.7
- @expo/xdl@57.9.6

## [Tue May 12 16:09:06 2020 -0700](https://github.com/expo/expo-cli/commit/4b7d38ed4823c9d0cc70dc44cf271d1232fc27ef)

### 📦 Packages updated

- @expo/babel-preset-cli@0.2.13
- @expo/config@3.2.3
- @expo/configure-splash-screen@0.1.4
- @expo/dev-server@0.1.4
- @expo/dev-tools@0.13.8
- @expo/electron-adapter@0.0.0-alpha.54
- expo-cli@3.20.5
- expo-codemod@1.0.23
- expo-optimize@0.1.26
- @expo/image-utils@0.2.24
- @expo/json-file@8.2.15
- @expo/metro-config@0.1.4
- @expo/next-adapter@2.1.6
- @expo/osascript@2.0.18
- @expo/package-manager@0.0.21
- pod-install@0.1.0
- expo-pwa@0.0.14
- @expo/schemer@1.3.14
- uri-scheme@1.0.11
- @expo/webpack-config@0.12.6
- @expo/xdl@57.9.5

## [Mon May 11 13:22:29 2020 -0700](https://github.com/expo/expo-cli/commit/21334851c174e4283a0f1833fc09cc18623091ff)

### 📦 Packages updated

- @expo/babel-preset-cli@0.2.12
- @expo/config@3.2.2
- @expo/configure-splash-screen@0.1.3
- @expo/dev-server@0.1.3
- @expo/dev-tools@0.13.7
- @expo/electron-adapter@0.0.0-alpha.53
- expo-cli@3.20.4
- expo-codemod@1.0.22
- expo-optimize@0.1.25
- @expo/image-utils@0.2.23
- @expo/json-file@8.2.14
- @expo/metro-config@0.1.3
- @expo/next-adapter@2.1.5
- @expo/osascript@2.0.17
- @expo/package-manager@0.0.20
- pod-install@0.0.0-alpha.15
- expo-pwa@0.0.13
- @expo/schemer@1.3.13
- uri-scheme@1.0.10
- @expo/webpack-config@0.12.5
- @expo/xdl@57.9.4

## [Sat May 9 17:18:56 2020 -0700](https://github.com/expo/expo-cli/commit/21995b53c5d70f01ddae9f17c22b475aabfe0e93)

### 📦 Packages updated

- @expo/configure-splash-screen@0.1.2

## [Thu May 7 21:47:13 2020 -0700](https://github.com/expo/expo-cli/commit/000d0d28d3b8a5e4a83bb985d3132a837cbb985d)

### 📦 Packages updated

- @expo/dev-tools@0.13.6
- expo-cli@3.20.3
- @expo/xdl@57.9.3

## [Thu May 7 21:29:36 2020 -0700](https://github.com/expo/expo-cli/commit/4ef85a2a6a286db1dea6b931fa87bcae9de8acde)

### 📦 Packages updated

- @expo/config@3.2.1
- @expo/configure-splash-screen@0.1.1
- @expo/dev-server@0.1.2
- @expo/dev-tools@0.13.5
- @expo/electron-adapter@0.0.0-alpha.52
- expo-cli@3.20.2
- expo-optimize@0.1.24
- @expo/metro-config@0.1.2
- @expo/next-adapter@2.1.4
- @expo/package-manager@0.0.19
- pod-install@0.0.0-alpha.14
- expo-pwa@0.0.12
- uri-scheme@1.0.9
- @expo/webpack-config@0.12.4
- @expo/xdl@57.9.2

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
