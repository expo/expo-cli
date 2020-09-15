# Changelog

This is the log of notable changes to Expo CLI and related packages.

## master

### 🛠 Breaking changes

- [expo-cli] Remove deprecated --web-only flag from start command

### 🎉 New features

- [expo-cli] EAS Build: Improve errors and warnings when deprecating API [#2639](https://github.com/expo/expo-cli/pull/2639)
- [expo-cli] support `--config` flag in `expo credentials:manager` [#2641](https://github.com/expo/expo-cli/pull/2641)

### 🐛 Bug fixes

## [Wed, 9 Sep 2020 13:28:10 -0700](https://github.com/expo/expo-cli/commit/7b9b00b12095ce6ea5c02c03f793fcc6bf0f55a7)

### 🎉 New features

- [expo-cli] Clean up TerminalUI ([#2614](https://github.com/expo/expo-cli/issues/2614))

### 🐛 Bug fixes

- [expo-cli] Default to silent when installing node dependencies through init

### 📦 Packages updated

- expo-cli@3.27.4

## [Wed, 9 Sep 2020 10:03:41 -0700](https://github.com/expo/expo-cli/commit/2a2a120e30d64ea535fb251ff203c97b457ab8bf)

### 🐛 Bug fixes

- [xdl] Use ~assets for publish and assets for export

### 📦 Packages updated

- @expo/dev-tools@0.13.42
- expo-cli@3.27.3
- @expo/xdl@58.0.3

## [Thu, 9 Sep 2020 16:32:14 +0200](https://github.com/expo/expo-cli/commit/58ac4c43d0b3e7cb8db5b2c46d8602bf101e33db)

### 🎉 New features

- [expo-cli] EAS Build: add `experimental.npmToken` to `credentials.json` [#2603](https://github.com/expo/expo-cli/pull/2603)
- [expo-cli] EAS Build: monorepo support [#2601](https://github.com/expo/expo-cli/pull/2601)

## [Thu, 8 Sep 2020 14:30:14 +0200](https://github.com/expo/expo-cli/commit/f0e24ee436806c109c19329c7e161fee0d2f0c81)

### 🛠 Breaking changes

- [xdl] Delete deprecated `Exp.extractAndInitializeTemplateApp`, `Exp.initGitRepoAsync`, `Exp.installDependenciesAsync`, `Exp.getPublishInfoAsync`, [#2590](https://github.com/expo/expo-cli/pull/2590)
- [expo-cli][export] No longer prompts to automatically delete conflicting files, they must now be manually deleted, or the command must be rerun with `--force` [#2576](https://github.com/expo/expo-cli/pull/2576)
- [xdl] Deleted deprecated `Web` module [#2588](https://github.com/expo/expo-cli/pull/2588)

### 🎉 New features

- [expo-cli][eject] support Facebook props being removed [#2566](https://github.com/expo/expo-cli/pull/2566))
- [expo-cli][config] Generate Android icons on eject and apply [#2087](https://github.com/expo/expo-cli/pull/2087)
- [expo-cli][export] List all conflicting files, allow for tolerable file collisions, prompt for `public-url` when it's not provided in interactive mode [#2576](https://github.com/expo/expo-cli/pull/2576)

### 🐛 Bug fixes

- [webpack] Fix copy webpack plugin for web overrides ([#2558](https://github.com/expo/expo-cli/issues/2558))

## [Thu, 3 Sep 2020 10:30:14 +0200](https://github.com/expo/expo-cli/commit/68920e489dd4508e30f0da14bbe91b36427380a7)

### 🐛 Bug fixes

- [expo-cli] fix Segment context format [#2560](https://github.com/expo/expo-cli/pull/2560)

### 📦 Packages updated

- expo-cli@3.26.2

## [Wed, 2 Sep 2020 11:12:02 -0700](https://github.com/expo/expo-cli/commit/c97aba21376324b2131bb5058d193aab5ceb77f4)

### 🎉 New features

- [expo-cli] EAS Build - track build process with Segment ([#2555](https://github.com/expo/expo-cli/issues/2555))

### 🐛 Bug fixes

- [cli] Fix requested sdk in upgrade command ([#2557](https://github.com/expo/expo-cli/issues/2557))

### 📦 Packages updated

- @expo/dev-tools@0.13.38
- expo-cli@3.26.1
- @expo/xdl@57.9.35

## [Tue, 1 Sep 2020 16:47:59 -0700](https://github.com/expo/expo-cli/commit/b4a945b6243f11555b5f1b37eba98289ca5f342b)

### 🛠 Breaking changes

- [expo-cli] remove `push:web:upload`, `push:web:generate`, `push:web:show`, `push:web:clear` ([#2531](https://github.com/expo/expo-cli/pull/2531) by [@EvanBacon](https://github.com/EvanBacon))

### 🎉 New features

- [expo-cli] expo --help redesigned ([#2538](https://github.com/expo/expo-cli/pull/2538) by [@EvanBacon](https://github.com/EvanBacon))
- [expo-cli] expo upload - support tar.gz files from builds v2 ([#2504](https://github.com/expo/expo-cli/pull/2504) by [@EvanBacon](https://github.com/EvanBacon))
- [expo-cli] Implemented keychain storage for Apple ID ([#2508](https://github.com/expo/expo-cli/pull/2508) by [@EvanBacon](https://github.com/EvanBacon))
- [expo-cli] expo publish - Clean up upload results logs ([#2516](https://github.com/expo/expo-cli/pull/2516) by [@EvanBacon](https://github.com/EvanBacon))
- [expo-cli] expo eject - Added support for locales in eject and apply ([#2496](https://github.com/expo/expo-cli/pull/2496) by [@EvanBacon](https://github.com/EvanBacon))
- [expo-cli] expo publish - Log bundles after building ([#2527](https://github.com/expo/expo-cli/pull/2527) by [@EvanBacon](https://github.com/EvanBacon))
- [expo-cli] Improve warning logging on publish ([#2524](https://github.com/expo/expo-cli/issues/2524) by [@EvanBacon](https://github.com/EvanBacon))
- [expo-cli] Add shift+i hotkey in interactive prompt to select iOS simulator to open ([#2541](https://github.com/expo/expo-cli/pull/2541) by [@EvanBacon](https://github.com/EvanBacon))
- [expo-cli] Add shift+a hotkey in interactive prompt to select Android device/emulator to open ([#2550](https://github.com/expo/expo-cli/pull/2550) by [@EvanBacon](https://github.com/EvanBacon))
- [expo-cli] Improve edge case handling when upgrading Expo client in iOS simulator ([#2541](https://github.com/expo/expo-cli/pull/2541) by [@EvanBacon](https://github.com/EvanBacon))
- [expo-cli] expo eas:build - Add --skip-credentials-check option ([#2442](https://github.com/expo/expo-cli/pull/2442) by [@satya164](https://github.com/satya164))
- [expo-cli] Add a `eas:build:init` command ([#2443](https://github.com/expo/expo-cli/pull/2443) by [@satya164](https://github.com/satya164))
- [expo-cli] expo generate-module - Support for templates with Android native unit tests ([#2548](https://github.com/expo/expo-cli/pull/2548) by [@barthap](https://github.com/barthap))
- [expo-cli] eas build: collect build metadata ([#2532](https://github.com/expo/expo-cli/issues/2532))
- [xdl] Add support for passing app.json updates config to expo-updates in SDK 39 standalone apps ([#2539](https://github.com/expo/expo-cli/pull/2539) by [@esamelson](https://github.com/esamelson))

### 🐛 Bug fixes

- [dev-server] Use minify in prod ([#2526](https://github.com/expo/expo-cli/issues/2526) by [@EvanBacon](https://github.com/EvanBacon))
- [dev-tools] Fix layout shifting when url becomes available by rendering a placeholder for QR code ([c34397c41](https://github.com/expo/expo-cli/commit/c34397c41d2661a37235fa2a8b2dde027e1c5b87) by [@brentvatne](https://github.com/brentvatne))
- [expo-cli] Eas build fix prompt for unsynced credentials ([#2546](https://github.com/expo/expo-cli/issues/2546) by [@wkozyra95](https://github.com/wkozyra95))
- [expo-cli] expo upload:android - fix `--use-submission-service` not resulting in non-zero exit code when upload fails ([#2530](https://github.com/expo/expo-cli/pull/2530) by [@mymattcarroll](https://github.com/mymattcarroll))
- [expo-cli] Fix `generate-module` to support latest `expo-module-template` ([#2510](https://github.com/expo/expo-cli/pull/2510) by [@barthap](https://github.com/barthap))
- [expo-cli] Fix `generate-module` filename generation for modules without `expo-` prefix ([#2548](https://github.com/expo/expo-cli/pull/2548) by [@barthap](https://github.com/barthap))
- [image-utils] Fix setting background color when calling `Jimp.resize` ([#2535](https://github.com/expo/expo-cli/pull/2535) by [@cruzach](https://github.com/cruzach))
- [xdl] Remove undistributable code from root build.gradle ([#2547](https://github.com/expo/expo-cli/issues/2547) by [@sjchmiela](https://github.com/sjchmiela))
- [xdl] Remove expo-image from SDK39 standalone apps ([#2533](https://github.com/expo/expo-cli/issues/2533) by [@sjchmiela](https://github.com/sjchmiela))

### 📦 Packages updated

- @expo/config@3.2.22
- @expo/dev-server@0.1.24
- @expo/dev-tools@0.13.37
- @expo/electron-adapter@0.0.15
- expo-cli@3.26.0
- expo-optimize@0.1.46
- @expo/image-utils@0.3.4
- @expo/metro-config@0.1.24
- @expo/next-adapter@2.1.28
- expo-pwa@0.0.34
- uri-scheme@1.0.30
- @expo/webpack-config@0.12.28
- @expo/xdl@57.9.34

## [Thu Aug 27 10:25:29 2020 -0700](https://github.com/expo/expo-cli/commit/5f41c9306d9da10ab8a85e99659d9a039cf9e90b)

### 🎉 New features

- [eject] Added support for allowBackup ([#2506](https://github.com/expo/expo-cli/pull/2506) by [@EvanBacon](https://github.com/EvanBacon))
- [eject] Warn before ejecting that some config needs to be set on dynamic config ([#1761](https://github.com/expo/expo-cli/pull/1761) by [@brentvatne](https://github.com/brentvatne))
- [expo-cli] Added no-install option to expo init ([#2515](https://github.com/expo/expo-cli/pull/2515) by [@EvanBacon](https://github.com/EvanBacon))

### 🐛 Bug fixes

- [image-utils] Add missing dependencies ([#2512](https://github.com/expo/expo-cli/pull/2512) by [@byCedric](https://github.com/byCedric))
- [webpack-config] fix: handle empty favicons ([#2423](https://github.com/expo/expo-cli/pull/2423) by [@jaulz](https://github.com/jaulz))
- [config] Update "googleMobileAdsAutoInit" to be optional ([#2317](https://github.com/expo/expo-cli/pull/2317) by [@JamieS1211](https://github.com/JamieS1211))
- [webpack-config] add compatibility for node-pushnotifications in service worker ([#1440](https://github.com/expo/expo-cli/pull/1440) by [@jaulz](https://github.com/jaulz))

### 📦 Packages updated

- @expo/config@3.2.21
- @expo/dev-server@0.1.23
- @expo/dev-tools@0.13.36
- @expo/electron-adapter@0.0.14
- expo-cli@3.25.1
- expo-optimize@0.1.45
- @expo/image-utils@0.3.3
- @expo/metro-config@0.1.23
- @expo/next-adapter@2.1.27
- expo-pwa@0.0.33
- uri-scheme@1.0.29
- @expo/webpack-config@0.12.27
- @expo/xdl@57.9.33

## [Wed Aug 26 12:13:11 2020 +0200](https://github.com/expo/expo-cli/commit/7d5820b3d6a32862205355a01684c66f3787354e)

### 🎉 New features

- [expo-cli] EAS Build: warn user when credentials are not git ignored ([#2482](https://github.com/expo/expo-cli/pull/2482) by [@wkozyra95](https://github.com/wkozyra95))
- [expo-cli] EAS Build: tweaks ([#2485](https://github.com/expo/expo-cli/pull/2485) by [@dsokal](https://github.com/dsokal)):
  - initialize a git repository if it does not exist yet
  - improve reading the bundle identifier from the Xcode project (handle the string interpolation case)
- [xdl] Add EXPO_TOKEN authentication method ([#2415](https://github.com/expo/expo-cli/pull/2415) by [@byCedric](https://github.com/byCedric))
- [expo-cli] Generate iOS icons on eject and apply ([#2495](https://github.com/expo/expo-cli/pull/2495) by [@EvanBacon](https://github.com/EvanBacon))
- [expo-cli] expo apply - prompt for bundle ID and package name ([#2498](https://github.com/expo/expo-cli/pull/2498) by [@EvanBacon](https://github.com/EvanBacon))
- [expo-cli] expo eject - added support for device families ([#2505](https://github.com/expo/expo-cli/pull/2505) by [@EvanBacon](https://github.com/EvanBacon))
- [expo-cli] EAS build: allow choosing scheme for ios project build ([#2501](https://github.com/expo/expo-cli/pull/2501) by [@dsokal](https://github.com/dsokal))

### 🐛 Bug fixes

- [expo-cli][xdl] EAS Build: Skip SDK version validation ([#2481](https://github.com/expo/expo-cli/pull/2481) by [@brentvatne](https://github.com/brentvatne))
- [expo-cli] expo apply - fix iOS name changing ([#2497](https://github.com/expo/expo-cli/pull/2497) by [@EvanBacon](https://github.com/EvanBacon))
- [expo-cli] expo apply - fix android schemes being added incorrectly ([#2507](https://github.com/expo/expo-cli/pull/2507) by [@EvanBacon](https://github.com/EvanBacon))
- [expo-cli] Fix progress bar when uploading iOS ([#2502](https://github.com/expo/expo-cli/pull/2502) by [@byCedric](https://github.com/byCedric))
- [expo-cli] Fix default bare project name to match regex in `expo-init` ([#2509](https://github.com/expo/expo-cli/pull/2509) by [@barthap](https://github.com/barthap))

### 📦 Packages updated

- @expo/config@3.2.20
- @expo/dev-server@0.1.22
- @expo/dev-tools@0.13.35
- @expo/electron-adapter@0.0.13
- expo-cli@3.25.0
- expo-optimize@0.1.44
- @expo/image-utils@0.3.2
- @expo/metro-config@0.1.22
- @expo/next-adapter@2.1.26
- expo-pwa@0.0.32
- uri-scheme@1.0.28
- @expo/webpack-config@0.12.26
- @expo/xdl@57.9.32

## [Tue, 18 Aug 2020 21:14:50 -0700](https://github.com/expo/expo-cli/commit/e98f6916378a5db2a670f0a86ad1f5eaccd7a053)

### 🛠 Breaking changes

- [webpack-config] Disable offline support by default in SDK 39 ([#2475](https://github.com/expo/expo-cli/issues/2475) by [@EvanBacon](https://github.com/EvanBacon))

### 🎉 New features

- [expo-cli]: EAS Build: add command `eas:credentials:sync` ([#2460](https://github.com/expo/expo-cli/pull/2460) by [@wkozyra95](https://github.com/wkozyra95))
- [xdl] update ios Podfile excluded unimodules for SDK 39 ([#2471](https://github.com/expo/expo-cli/issues/2471) by [esamelson](https://github.com/esamelson))

### 🐛 Bug fixes

- [expo-cli] Only run expo service checks from the doctor command ([#2474](https://github.com/expo/expo-cli/issues/2474) by [@byCedric](https://github.com/byCedric))

### 📦 Packages updated

- @expo/dev-tools@0.13.34
- @expo/electron-adapter@0.0.12
- expo-cli@3.24.2
- @expo/next-adapter@2.1.25
- @expo/webpack-config@0.12.25
- @expo/xdl@57.9.31

## [Tue Aug 18 14:03:16 2020 +0200](https://github.com/expo/expo-cli/commit/2329769df21245f3cb625fd9b2aeac10baa06969)

### 🛠 Breaking changes

- [expo-cli] EAS Build: Upgrade `@expo/build-tools` to `0.1.14` to add support for glob patterns for `artifactPath`.

### 🎉 New features

- [expo-cli] Force users to confirm deleting android credentials ([#2457](https://github.com/expo/expo-cli/pull/2457) by [@byCedric](https://github.com/byCedric))
- [expo-cli] EAS Build: print credentials source before running build ([#2453](https://github.com/expo/expo-cli/pull/2453) by [@dsokal](https://github.com/dsokal))
- [expo-cli][xdl] expo doctor - add network check ([#2424](https://github.com/expo/expo-cli/pull/2424) by [@byCedric](https://github.com/byCedric))
- [expo-cli] expo eject - support projects with dynamic or missing configs ([#2464](https://github.com/expo/expo-cli/pull/2464) by [@EvanBacon](https://github.com/EvanBacon))
- [config] Allow scheme arrays ([#2462](https://github.com/expo/expo-cli/pull/2462) by [@EvanBacon](https://github.com/EvanBacon))

### 🐛 Bug fixes

- [expo-cli] EAS Build: better error handling when using local credentials.json ([#2452](https://github.com/expo/expo-cli/pull/2452) by [@wkozyra95](https://github.com/wkozyra95))
- [package-manager] fix pod-install for macOS projects ([#2461](https://github.com/expo/expo-cli/pull/2461) by [@Simek](https://github.com/Simek))
- [xdl] Expand Android permissions blacklist and add annotations ([#2458](https://github.com/expo/expo-cli/pull/2458) by [@byCedric](https://github.com/byCedric))

### 📦 Packages updated

- @expo/config@3.2.19
- @expo/dev-server@0.1.21
- @expo/dev-tools@0.13.33
- @expo/electron-adapter@0.0.11
- expo-cli@3.24.1
- expo-optimize@0.1.43
- @expo/metro-config@0.1.21
- @expo/next-adapter@2.1.24
- @expo/package-manager@0.0.31
- pod-install@0.1.10
- expo-pwa@0.0.31
- uri-scheme@1.0.27
- @expo/webpack-config@0.12.24
- @expo/xdl@57.9.30

## [Tue Aug 11 10:28:08 2020 +0200](https://github.com/expo/expo-cli/commit/199f5ef051a5829feb7e27a48031bed4e2f5f40f)

### 🛠 Breaking changes

- [expo-cli][xdl] Stop using api v1 endpoints for credentials ([#2422](https://github.com/expo/expo-cli/pull/2422) by [@wkozyra95](https://github.com/wkozyra95)).
- [expo-cli] Rename eas.json field: `buildCommand` -> `gradleCommand` ([#2432](https://github.com/expo/expo-cli/pull/2432) by [@dsokal](https://github.com/dsokal)).
- [expo-cli] Upgrade `@expo/build-tools` to `0.1.13` to change the default Gradle task (`:app:assembleRelease` -> `:app:bundleRelease`) for generic Android build.

### 🎉 New features

- [expo-cli] Implement auto-configuration for Android projects ([#2427](https://github.com/expo/expo-cli/pull/2427) by [@satya164](https://github.com/satya164)).
- [expo-cli] Make output of the `expo eas:build` command more readable ([#2428](https://github.com/expo/expo-cli/pull/2428) by [@wkozyra95](https://github.com/wkozyra95)).
- [expo-cli] Add `artifactPath` for generic iOS build profiles & set `app-bundle` as the default build type for managed Android builds ([#2435](https://github.com/expo/expo-cli/pull/2435) by [@dsokal](https://github.com/dsokal)).

### 🐛 Bug fixes

- [config] Fix generated orientation in AndroidManifest.xml ([#2431](https://github.com/expo/expo-cli/pull/2431) by [@barthap](https://github.com/barthap)).

### 📦 Packages updated

- @expo/config@3.2.18
- @expo/dev-server@0.1.20
- @expo/dev-tools@0.13.32
- @expo/electron-adapter@0.0.10
- expo-cli@3.24.0
- expo-optimize@0.1.42
- @expo/metro-config@0.1.20
- @expo/next-adapter@2.1.23
- expo-pwa@0.0.30
- uri-scheme@1.0.26
- @expo/webpack-config@0.12.23
- @expo/xdl@57.9.29

## [Tue Aug 4 11:44:18 2020 +0200](https://github.com/expo/expo-cli/commit/1110d7a2526d5c586c057aa1db7191011b6bb508)

### 🛠 Breaking changes

- Renamed commands for EAS Builds ([#2419](https://github.com/expo/expo-cli/pull/2419) by [@dsokal](https://github.com/dsokal)):
  - `expo build` -> `expo eas:build`
  - `expo build-status` -> `expo eas:build:status`

### 🎉 New features

- Reimplement bundling with Metro JS APIs (no file watching or HTTP servers), enabled in `expo publish` and `expo export` when `EXPO_USE_DEV_SERVER` is set to `true`. ([#2149](https://github.com/expo/expo-cli/pull/2149) by [@fson](https://github.com/fson)).
- Implement autoconfiguring bare iOS projects so they are buildable with EAS Builds. ([#2395](https://github.com/expo/expo-cli/pull/2395) by [@dsokal](https://github.com/dsokal)).

### 📦 Packages updated

- @expo/config@3.2.17
- @expo/configure-splash-screen@0.1.14
- @expo/dev-server@0.1.19
- @expo/dev-tools@0.13.30
- @expo/electron-adapter@0.0.9
- expo-cli@3.23.2
- expo-optimize@0.1.41
- @expo/metro-config@0.1.19
- @expo/next-adapter@2.1.22
- expo-pwa@0.0.29
- uri-scheme@1.0.25
- @expo/webpack-config@0.12.22
- @expo/xdl@57.9.27

## [Thu, 30 Jul 2020 13:42:33 -0700](https://github.com/expo/expo-cli/commit/5adda7a1af91bd05b299db8a342ef43e9035dd61)

### 🛠 Breaking changes

- Delete the deprecated `expo android` command ([#2215](https://github.com/expo/expo-cli/issues/2215))
- Delete deprecated `expo ios` command ([#2216](https://github.com/expo/expo-cli/issues/2216))

### 🎉 New features

- [xdl] Log output from Gradle Wrapper is a lot cleaner now. It doesn't print dots when the appropriate Gradle version is being downloaded ([#2355](https://github.com/expo/expo-cli/pull/2355)).
- [expo-cli] expo upload:android - Add better error messages when downloading archive file failed [#2384](https://github.com/expo/expo-cli/pull/2384).
- [expo-cli] perfomance improvment for operations on credentials (more efficient internal caching) [#2380](https://github.com/expo/expo-cli/pull/2380).
- [expo-cli] Add a command to get build status for turtle v2 builds

### 🐛 Bug fixes

- [configure-splash-screen] Bump cli-platform-[ios/android] versions for logkitty security fix
- [nextjs] Fix next.js adapter bug ([#2412](https://github.com/expo/expo-cli/issues/2412))
- [expo-cli] cleanup apple id credentials logic ([#2409](https://github.com/expo/expo-cli/issues/2409))
- [expo-cli] don't print function string in error message ([#2407](https://github.com/expo/expo-cli/issues/2407))
- [expo-cli] fix lint error
- [expo-cli]: IosApi handle properly missing credentials
- [expo-cli] base64 decode when saving p8 file ([#2404](https://github.com/expo/expo-cli/issues/2404))
- [expo-cli] revert PR #2404 and remove encoding from IosPushCredentials ([#2406](https://github.com/expo/expo-cli/issues/2406))
- [expo-cli] check `when` field when prompting in noninteractive mode ([#2393](https://github.com/expo/expo-cli/issues/2393))
- [xdl] Remove UpdateVersions from xdl ([#2387](https://github.com/expo/expo-cli/issues/2387))
- [xdl] Stop ADB daemon only when it was launched by xdl ([#2064](https://github.com/expo/expo-cli/issues/2064))
- [config] Implement "useNextNotificationsApi" configuration SDK 38 ([#2318](https://github.com/expo/expo-cli/issues/2318))
- [configure-splash-screen] fix a command instructions ([#2370](https://github.com/expo/expo-cli/issues/2370))
- [expo-cli] upload:android - add better error messages for issues with downloading archive file ([#2384](https://github.com/expo/expo-cli/issues/2384))
- [expo-cli] submission service: fix passing archive type from command line ([#2383](https://github.com/expo/expo-cli/issues/2383))
- [expo-cli] expo upload:android - fix help output - --latest is not default
- [xdl] Fix incorrect check of the packager port in the "setOptionsAsync" function. Fixes #2270
- [expo-cli] consolidate env variables. ([#2358](https://github.com/expo/expo-cli/issues/2358))

### 📦 Packages updated

- @expo/babel-preset-cli@0.2.17
- @expo/config@3.2.16
- @expo/configure-splash-screen@0.1.13
- @expo/dev-server@0.1.17
- @expo/dev-tools@0.13.28
- @expo/electron-adapter@0.0.8
- expo-cli@3.23.0
- expo-codemod@1.0.28
- expo-optimize@0.1.40
- @expo/image-utils@0.3.1
- @expo/json-file@8.2.22
- @expo/metro-config@0.1.17
- @expo/next-adapter@2.1.21
- @expo/osascript@2.0.23
- @expo/package-manager@0.0.30
- @expo/plist@0.0.9
- pod-install@0.1.9
- expo-pwa@0.0.28
- @expo/schemer@1.3.20
- uri-scheme@1.0.24
- @expo/webpack-config@0.12.21
- @expo/xdl@57.9.25

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
