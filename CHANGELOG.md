# Changelog

This is the log of notable changes to Expo CLI and related packages.

## master

### 🛠 Breaking changes

### 🎉 New features

### 🧹 Chores

### 🐛 Bug fixes

## [Fri, 14 May 2021 14:16:05 -0700](https://github.com/expo/expo-cli/commit/0e2b0e5dd8d3c0eefa9e18ab32cd98b87d789a01)

### 🛠 Breaking changes

### 🎉 New features

- [config-plugins] detect default build configuration for scheme ([#3474](https://github.com/expo/expo-cli/issues/3474))
- [config-plugins] support PKCS keystores for android builds ([#3472](https://github.com/expo/expo-cli/issues/3472))

### 🧹 Chores

- [cli] Stop running `adb shell monkey` when opening apps other than Expo Go ([#3487](https://github.com/expo/expo-cli/issues/3487))
- [config-plugins] Add noop Swift file to fix builds with Swift deps ([#3488](https://github.com/expo/expo-cli/issues/3488))
- Update to @expo/configure-splash-screen@0.4.0
- Update tsconfig to support node 12 ([#3489](https://github.com/expo/expo-cli/issues/3489))
- Add additional hermes resolution ([#3486](https://github.com/expo/expo-cli/issues/3486))
- disable wiping the console in tsc watch mode ([#3481](https://github.com/expo/expo-cli/issues/3481))

### 🐛 Bug fixes

- [cli] fix expo export so it finds the correct projectDir ([#3485](https://github.com/expo/expo-cli/issues/3485))
- [xdl] Limit manifest serving to a few URLs ([#3491](https://github.com/expo/expo-cli/issues/3491))
- [config] fix return typing of modifyConfigAsync ([#3482](https://github.com/expo/expo-cli/issues/3482))

### 📦 Packages updated

- @expo/config-plugins@1.0.31
- @expo/config@3.3.41
- @expo/dev-server@0.1.67
- @expo/dev-tools@0.13.97
- expo-cli@4.4.7
- expo-codemod@1.1.2
- expo-optimize@0.1.89
- @expo/image-utils@0.3.14
- @expo/json-file@8.2.30
- @expo/metro-config@0.1.67
- @expo/next-adapter@2.1.72
- @expo/osascript@2.0.28
- @expo/package-manager@0.0.43
- @expo/pkcs12@0.0.5
- @expo/plist@0.0.13
- pod-install@0.1.23
- expo-pwa@0.0.77
- @expo/schemer@1.3.29
- uri-scheme@1.0.78
- @expo/webpack-config@0.12.71
- xdl@59.0.37


## [Tue, 11 May 2021 14:19:49 -0700](https://github.com/expo/expo-cli/commit/79e6091d479a1ab7abd7dc07c61bfa37beee6680)

### 🧹 Chores

- [cli] Improve unlikely error message

### 🐛 Bug fixes

- [cli] Add missing nullthrows package

### 📦 Packages updated

- expo-cli@4.4.6

## [Tue, 11 May 2021 14:01:05 -0700](https://github.com/expo/expo-cli/commit/f8cbaef2ab4708ada6159e9eee65bfa3cb55cea0)

### 🧹 Chores

- [cli] Update supported Node versions validation
- [workspace] update TypeScript to latest release ([#3454](https://github.com/expo/expo-cli/issues/3454))

### 🐛 Bug fixes

- [config-plugins] ignore case when reading scheme ([#3465](https://github.com/expo/expo-cli/issues/3465))
- [cli] Remove URL mismatch warning ([#3467](https://github.com/expo/expo-cli/issues/3467))

### 📦 Packages updated

- @expo/config-plugins@1.0.30
- @expo/config@3.3.40
- @expo/dev-server@0.1.66
- @expo/dev-tools@0.13.96
- expo-cli@4.4.5
- expo-optimize@0.1.88
- @expo/metro-config@0.1.66
- @expo/next-adapter@2.1.71
- expo-pwa@0.0.76
- uri-scheme@1.0.77
- @expo/webpack-config@0.12.70
- xdl@59.0.36

## [Thu, 6 May 2021 19:37:12 -0700](https://github.com/expo/expo-cli/commit/f7dfc87744de00e98fdb301b4814e7fca61a1465)

### 🛠 Breaking changes

### 🎉 New features

- [cli] use bundledNativeModules.json from api ([#3444](https://github.com/expo/expo-cli/issues/3444))
- [cli] Added expo-dev-client to auto plugins ([#3436](https://github.com/expo/expo-cli/issues/3436))
- [cli] "expo is not installed" error ([#3425](https://github.com/expo/expo-cli/issues/3425))
- [install] add config plugins automatically ([#3437](https://github.com/expo/expo-cli/issues/3437))
- [run] add --no-bundler option ([#3460](https://github.com/expo/expo-cli/issues/3460))
- [prebuild] Added template prop  ([#3439](https://github.com/expo/expo-cli/issues/3439))
- [run] output logs and clear on pod folder ([#3457](https://github.com/expo/expo-cli/issues/3457))
- [CI] add tests on Windows ([#3428](https://github.com/expo/expo-cli/issues/3428))
- [workspace] deduplicate yarn lock in `postinstall` ([#3418](https://github.com/expo/expo-cli/issues/3418))
- [cli] validate dependencies also on `doctor` run ([#3416](https://github.com/expo/expo-cli/issues/3416))
- Deep link into dev menu when it's installed ([#3405](https://github.com/expo/expo-cli/issues/3405))
- Improve errors when a package doesn't have a valid plugin ([#3421](https://github.com/expo/expo-cli/issues/3421))
- Added a flag to skip git status check ([#3401](https://github.com/expo/expo-cli/issues/3401))
- Add port selection to start --dev-client ([#3409](https://github.com/expo/expo-cli/issues/3409))


### 🧹 Chores

- Pad titles in log formatter and add duration ([#3466](https://github.com/expo/expo-cli/issues/3466))
- [cli] remove dead code ([#3455](https://github.com/expo/expo-cli/issues/3455))
- [electron] migrate to new repo ([#3446](https://github.com/expo/expo-cli/issues/3446))
- [configure-splash-screen]: remove core-js dependency ([#3422](https://github.com/expo/expo-cli/issues/3422))
- [configure-splash-screen] remove deep-equal dependency ([#3417](https://github.com/expo/expo-cli/issues/3417))
- [workspace] update ESLint and Prettier ([#3427](https://github.com/expo/expo-cli/issues/3427))
- [cli][xdl] return correct project page url after expo publish ([#3398](https://github.com/expo/expo-cli/issues/3398))
- Expand Info.plist type ([#3442](https://github.com/expo/expo-cli/issues/3442))
- bump minimum Node target to 12 ([#3434](https://github.com/expo/expo-cli/issues/3434))
- Delete `publishSourceMapPath` ([#3430](https://github.com/expo/expo-cli/issues/3430))
- Improve ios start up times ([#3413](https://github.com/expo/expo-cli/issues/3413))
- Improve cocoapods error messages ([#3411](https://github.com/expo/expo-cli/issues/3411))

### 🐛 Bug fixes

- Fix bundle identifier validation ([#3443](https://github.com/expo/expo-cli/issues/3443))
- Fix running dev client from the terminal UI using wrong bundle identifier ([#3407](https://github.com/expo/expo-cli/issues/3407))

### 📦 Packages updated

- @expo/config-plugins@1.0.29
- @expo/config@3.3.39
- @expo/dev-server@0.1.65
- @expo/dev-tools@0.13.95
- expo-cli@4.4.4
- expo-optimize@0.1.87
- @expo/metro-config@0.1.65
- @expo/next-adapter@2.1.70
- @expo/osascript@2.0.27
- @expo/package-manager@0.0.42
- pod-install@0.1.22
- expo-pwa@0.0.75
- uri-scheme@1.0.76
- @expo/webpack-config@0.12.69
- xdl@59.0.35

## [Tue, 20 Apr 2021 19:53:53 -0700](https://github.com/expo/expo-cli/commit/af417362f24d74af76ceb4ff82699c16d17025d4)

### 🛠 Breaking changes

### 🎉 New features

- Enable socket controls in run:ios and run:android ([#3403](https://github.com/expo/expo-cli/issues/3403))

### 🧹 Chores

- Remove readConfigJsonAsync shim ([#3402](https://github.com/expo/expo-cli/issues/3402))

### 🐛 Bug fixes

- [config-plugins] Make user interface style default to light if not specified ([#3404](https://github.com/expo/expo-cli/issues/3404))

### 📦 Packages updated

- @expo/config-plugins@1.0.28
- @expo/config@3.3.38
- @expo/dev-server@0.1.64
- @expo/dev-tools@0.13.94
- @expo/electron-adapter@0.0.55
- expo-cli@4.4.3
- expo-optimize@0.1.86
- @expo/metro-config@0.1.64
- @expo/next-adapter@2.1.69
- expo-pwa@0.0.74
- uri-scheme@1.0.75
- @expo/webpack-config@0.12.68
- xdl@59.0.34

## [Mon, 19 Apr 2021 17:00:03 -0700](https://github.com/expo/expo-cli/commit/50562c70e9cda584465b01c4520ac82d29a4738f)

### 🛠 Breaking changes

- Force overwriting by default in export, remove `--force` flag ([#3395](https://github.com/expo/expo-cli/issues/3395))

### 🎉 New features

- [config-plugins] feat: enable splash screen plugin for any SDK greater than 38 ([#3397](https://github.com/expo/expo-cli/issues/3397))
- print bundle sizes in export ([#3393](https://github.com/expo/expo-cli/issues/3393))

### 🧹 Chores

- improve cocoapods manager ([#3399](https://github.com/expo/expo-cli/issues/3399))
- [xdl][expo-cli] Adds action event to unified project ([#3372](https://github.com/expo/expo-cli/issues/3372))
- Add known packages to improve tracing ([#3392](https://github.com/expo/expo-cli/issues/3392))
- [metro-config] Skip babel runtime helpers ([#3391](https://github.com/expo/expo-cli/issues/3391))
- remove node 10 support and assert wrapper ([#3356](https://github.com/expo/expo-cli/issues/3356))

### 📦 Packages updated

- @expo/babel-preset-cli@0.2.20
- @expo/config-plugins@1.0.27
- @expo/config@3.3.37
- @expo/dev-server@0.1.63
- @expo/dev-tools@0.13.93
- @expo/electron-adapter@0.0.54
- expo-cli@4.4.2
- expo-codemod@1.1.1
- expo-optimize@0.1.85
- @expo/image-utils@0.3.13
- @expo/json-file@8.2.29
- @expo/metro-config@0.1.63
- @expo/next-adapter@2.1.68
- @expo/osascript@2.0.26
- @expo/package-manager@0.0.41
- pod-install@0.1.21
- expo-pwa@0.0.73
- @expo/schemer@1.3.28
- uri-scheme@1.0.74
- @expo/webpack-config@0.12.67
- xdl@59.0.33

## [Wed, 14 Apr 2021 12:36:03 -0700](https://github.com/expo/expo-cli/commit/30b4a040a81de0c73103e51ae38bbf4be8a58898)

### 🧹 Chores

- Update schema cache for SDK 41. Get a cool matching version: expo-cli@4.4.1 for SDK 41.

### 📦 Packages updated

- @expo/dev-tools@0.13.92
- expo-cli@4.4.1
- xdl@59.0.32

## [Wed, 14 Apr 2021 11:54:49 -0700](https://github.com/expo/expo-cli/commit/6bf320b102933730a9611011e46aac419736396c)

### 🛠 Breaking changes

### 🎉 New features

- [cli] Handle async storage package rename in upgrade command ([#3386](https://github.com/expo/expo-cli/issues/3386))

### 🧹 Chores

- Update test.yml to test against Node 12 and 14 ([#3388](https://github.com/expo/expo-cli/issues/3388))
- [config-plugins] Replace docs in README with link to Expo docs ([#3384](https://github.com/expo/expo-cli/issues/3384))
- [cli] Add deprecation message to --config flag ([#3382](https://github.com/expo/expo-cli/issues/3382))
- [dev-tools] flip `noEmit` flag to preserve server build ([#3379](https://github.com/expo/expo-cli/issues/3379))

### 🐛 Bug fixes

- Support building apps with escaped names ([#3383](https://github.com/expo/expo-cli/issues/3383))
- [codemod] Removed version gate ([#3390](https://github.com/expo/expo-cli/issues/3390))

### 📦 Packages updated

- @expo/config-plugins@1.0.26
- @expo/config@3.3.36
- @expo/dev-server@0.1.62
- @expo/dev-tools@0.13.91
- @expo/electron-adapter@0.0.53
- expo-cli@4.4.0
- expo-codemod@1.1.0
- expo-optimize@0.1.84
- @expo/metro-config@0.1.62
- @expo/next-adapter@2.1.67
- @expo/package-manager@0.0.40
- pod-install@0.1.20
- expo-pwa@0.0.72
- uri-scheme@1.0.73
- @expo/webpack-config@0.12.66
- xdl@59.0.31

## [Fri, 9 Apr 2021 15:05:32 -0700](https://github.com/expo/expo-cli/commit/31ce5bb9a78be83ee46a98a72d41652c05aa374c)

### 🎉 New features

- Added `currentFullName` to the public config ([#3376](https://github.com/expo/expo-cli/issues/3376))
- Added getUserProjectIdAsync method ([#3359](https://github.com/expo/expo-cli/issues/3359))
- Profile android build time ([#3348](https://github.com/expo/expo-cli/issues/3348))

### 🧹 Chores

- Simplify Config module ([#3373](https://github.com/expo/expo-cli/issues/3373))
- Clean up logging messages ([#3357](https://github.com/expo/expo-cli/issues/3357))
- Delete Api module ([#3360](https://github.com/expo/expo-cli/issues/3360))
- Improve no xcode warnings ([#3363](https://github.com/expo/expo-cli/issues/3363))
- Improve bundle identifier regex ([#3355](https://github.com/expo/expo-cli/issues/3355))
- Improved ios package logging ([#3353](https://github.com/expo/expo-cli/issues/3353))
- Remove deprecated property "xde" from the manifest ([#3366](https://github.com/expo/expo-cli/issues/3366))
- Remove Config.offline ([#3374](https://github.com/expo/expo-cli/issues/3374))
- Remove Config.helpUrl, use learnMore ([#3364](https://github.com/expo/expo-cli/issues/3364))
- Remove unused ncp ([#3367](https://github.com/expo/expo-cli/issues/3367))
- Remove unused TerminalLink.fallbackToUrl from XDL ([#3368](https://github.com/expo/expo-cli/issues/3368))
- Move dev dep ([#3362](https://github.com/expo/expo-cli/issues/3362))
- [config-plugins] Throw better error message when target does not exists ([#3350](https://github.com/expo/expo-cli/issues/3350))
- [dev-client] Allow running projects without app.json ([#3371](https://github.com/expo/expo-cli/issues/3371))
- [next-adapter] update RNW peer, remove deprecated types ([#3377](https://github.com/expo/expo-cli/issues/3377))
- [xdl] Remove unused xde spawn script ([#3365](https://github.com/expo/expo-cli/issues/3365))

### 🐛 Bug fixes

- [expo-cli] Fix missing/extraneous dependencies
- [xdl] Fix missing/extraneous dependencies ([#3369](https://github.com/expo/expo-cli/issues/3369))
- Fix prompt bug when opening on iOS ([#3358](https://github.com/expo/expo-cli/issues/3358))
- Fix product name getter ([#3354](https://github.com/expo/expo-cli/issues/3354))

### 📦 Packages updated

- @expo/config-plugins@1.0.25
- @expo/config@3.3.35
- @expo/dev-server@0.1.61
- @expo/dev-tools@0.13.90
- @expo/electron-adapter@0.0.52
- expo-cli@4.3.5
- expo-optimize@0.1.83
- @expo/metro-config@0.1.61
- @expo/next-adapter@2.1.66
- expo-pwa@0.0.71
- uri-scheme@1.0.72
- @expo/webpack-config@0.12.65
- xdl@59.0.30

## [Thu, 1 Apr 2021 14:25:44 -0700](https://github.com/expo/expo-cli/commit/4bbb35de0096a6369d38e5369c1120cead620ae4)

### 🎉 New features

- Activate android emulator window ([#3345](https://github.com/expo/expo-cli/issues/3345))
- Created unversioned react-native-maps plugin ([#3343](https://github.com/expo/expo-cli/issues/3343))
- Add migration from @react-native-community/async-storage ([#3342](https://github.com/expo/expo-cli/issues/3342))
- Run built APK on device ([#3338](https://github.com/expo/expo-cli/issues/3338))
- Added expo config command to expo-cli ([#3323](https://github.com/expo/expo-cli/issues/3323))
- Added device selection prop to run:android ([#3331](https://github.com/expo/expo-cli/issues/3331))
- Pipe ora output to stdout in non-interactive mode ([#3329](https://github.com/expo/expo-cli/issues/3329))
- Sort code signing identities by last selected ([#3321](https://github.com/expo/expo-cli/issues/3321))
- Allow single platform for dev client schemes ([#3309](https://github.com/expo/expo-cli/issues/3309))
- Improve single platform dev client ([#3337](https://github.com/expo/expo-cli/issues/3337))
- Improve running in a project with single platform ([#3336](https://github.com/expo/expo-cli/issues/3336))
- Code signing xcode projects automatically in development ([#3317](https://github.com/expo/expo-cli/issues/3317))
- Auto install ios-deploy ([#3308](https://github.com/expo/expo-cli/issues/3308))
- Improved device deployment ([#3306](https://github.com/expo/expo-cli/issues/3306))
- Created ios command ([#3303](https://github.com/expo/expo-cli/issues/3303))

### 🧹 Chores

- Remove gulp and build with tsc from xdl ([#3334](https://github.com/expo/expo-cli/issues/3334))
- Create cocoapods dep check file sooner ([#3346](https://github.com/expo/expo-cli/issues/3346))
- Improve bplist parsing ([#3330](https://github.com/expo/expo-cli/issues/3330))
- Updated metro config warning to reflect SDK 41 by default. ([#3325](https://github.com/expo/expo-cli/issues/3325))
- Added spinner for device searching ([#3328](https://github.com/expo/expo-cli/issues/3328))
- Improve IOSDeploy logging ([#3326](https://github.com/expo/expo-cli/issues/3326))
- Remove -showBuildSettings usages ([#3318](https://github.com/expo/expo-cli/issues/3318))
- Update xmldom and xcode dependencies ([#3314](https://github.com/expo/expo-cli/issues/3314))
- Remove windows extraction binary ([#3165](https://github.com/expo/expo-cli/issues/3165))

### 🐛 Bug fixes

- Prevent removing existing schemes from AndroidManifest.xml ([#3324](https://github.com/expo/expo-cli/issues/3324))
- Fix a bug where an IntentFilter could be overridden by the Scheme plugin. ([#3319](https://github.com/expo/expo-cli/issues/3319))
- Fix broken debug spinner ([#3322](https://github.com/expo/expo-cli/issues/3322))

### 📦 Packages updated

- @expo/babel-preset-cli@0.2.19
- @expo/config-plugins@1.0.24
- @expo/config@3.3.34
- @expo/dev-server@0.1.60
- @expo/dev-tools@0.13.88
- @expo/electron-adapter@0.0.51
- expo-cli@4.3.3
- expo-codemod@1.0.31
- expo-optimize@0.1.82
- @expo/image-utils@0.3.12
- @expo/json-file@8.2.28
- @expo/metro-config@0.1.60
- @expo/next-adapter@2.1.65
- @expo/osascript@2.0.25
- @expo/package-manager@0.0.39
- @expo/plist@0.0.12
- pod-install@0.1.19
- expo-pwa@0.0.70
- @expo/schemer@1.3.27
- uri-scheme@1.0.71
- @expo/webpack-config@0.12.64
- xdl@59.0.28

## [Fri, 19 Mar 2021 10:26:48 -0700](https://github.com/expo/expo-cli/commit/c4b3c767269e6e5efd1abd9fa3b72b066eed2a00)

### 🐛 Bug fixes

- [cli] hide run:android
- [xdl] facebookReactNativeVersionToExpoVersionAsync: only map to released versions ([#3305](https://github.com/expo/expo-cli/issues/3305))
- [xdl] show uncaught exceptions ([#3302](https://github.com/expo/expo-cli/issues/3302))

### 📦 Packages updated

- @expo/config-plugins@1.0.23
- @expo/config@3.3.33
- @expo/dev-server@0.1.59
- @expo/dev-tools@0.13.87
- @expo/electron-adapter@0.0.50
- expo-cli@4.3.2
- expo-optimize@0.1.81
- @expo/metro-config@0.1.59
- @expo/next-adapter@2.1.64
- expo-pwa@0.0.69
- uri-scheme@1.0.70
- @expo/webpack-config@0.12.63
- xdl@59.0.27

## [Thu, 18 Mar 2021 12:11:59 -0700](https://github.com/expo/expo-cli/commit/10162d5800ed830d9bbce56973e8f063e1d69c7c)

### 🛠 Breaking changes

### 🎉 New features

- [cli] Added devClient option to mobile options ([#3301](https://github.com/expo/expo-cli/issues/3301))
- [cli] Added socket controls ([#3280](https://github.com/expo/expo-cli/issues/3280))
- [cli] skip update check when EAS_BUILD=1 ([#3290](https://github.com/expo/expo-cli/issues/3290))
- [config-plugins] Added withGradleProperties mod ([#3298](https://github.com/expo/expo-cli/issues/3298))
- [config-plugins] Created withSwiftBridgingHeader ([#3284](https://github.com/expo/expo-cli/issues/3284))
- [config-plugins] add expo-ads-facebook to list of auto plugins ([#3289](https://github.com/expo/expo-cli/issues/3289))
- [doctor] Re-enable checking reachability of exp.host domain ([#3285](https://github.com/expo/expo-cli/issues/3285))
- [eject] preserve expo dev client scripts ([#3300](https://github.com/expo/expo-cli/issues/3300))
- [expo-cli] skip updating dependencies in package.json in `expo prebuild` ([#3278](https://github.com/expo/expo-cli/issues/3278))
- [init] Change template project default branch from master to main ([#3297](https://github.com/expo/expo-cli/issues/3297))
- [logs] Improve errors thrown by invariant ([#3281](https://github.com/expo/expo-cli/issues/3281))
- [logs] Mute regenerator runtime and setimmediate stack traces ([#3294](https://github.com/expo/expo-cli/issues/3294))
- [prebuild] Added clean flag to prebuild ([#3295](https://github.com/expo/expo-cli/issues/3295))
- [run] Add a command to build and run on Android ([#3239](https://github.com/expo/expo-cli/issues/3239))
- [run] Added debug simctl logger ([#3293](https://github.com/expo/expo-cli/issues/3293))

### 🐛 Bug fixes

- Pause interactions after stopping ([#3286](https://github.com/expo/expo-cli/issues/3286))

### 🧹 Chores

- Move export code from xdl to expo-cli ([#3233](https://github.com/expo/expo-cli/issues/3233))
- Refactor projectDir -> projectRoot ([#3292](https://github.com/expo/expo-cli/issues/3292))
- Remove unused detach code from XDL and rename the package ([#3268](https://github.com/expo/expo-cli/issues/3268))
- updated getenv dependencies to 1.0.0 ([#3299](https://github.com/expo/expo-cli/issues/3299))

### 📦 Packages updated

- @expo/config-plugins@1.0.22
- @expo/config@3.3.32
- @expo/dev-server@0.1.58
- @expo/dev-tools@0.13.86
- @expo/electron-adapter@0.0.49
- expo-cli@4.3.1
- expo-optimize@0.1.80
- @expo/image-utils@0.3.11
- @expo/metro-config@0.1.58
- @expo/next-adapter@2.1.63
- expo-pwa@0.0.68
- uri-scheme@1.0.69
- @expo/webpack-config@0.12.62
- xdl@59.0.26

## [Tue, 9 Mar 2021 11:17:38 -0800](https://github.com/expo/expo-cli/commit/7f66dad2ed570e2d001ea47ed6aabebd16ec8bfe)

### 🛠 Breaking changes

- [cli] Delete e (send to) command from terminal ui ([#3274](https://github.com/expo/expo-cli/issues/3274))

### 🎉 New features

- [cli] Unify terminal stack trace logs ([#3275](https://github.com/expo/expo-cli/issues/3275))
- [cli] Collapse first frame if it's useless ([#3276](https://github.com/expo/expo-cli/issues/3276))
- [cli][xdl] Rename Expo client to Expo Go wherever it makes sense

### 🐛 Bug fixes

- [cli] Remove Slack link from README
- [config-plugins] eas build:configure fixes for Windows ([#3266](https://github.com/expo/expo-cli/issues/3266))
- [config-plugins] Add release channel key to updates modules
- [config-plugins] Support quote marks in target name in pbxproj ([#3264](https://github.com/expo/expo-cli/issues/3264))
- [metro-config] Use relative asset registry path ([#3273](https://github.com/expo/expo-cli/issues/3273))
- [xdl] Fix launching Android and iOS from terminal UI in unversioned apps

### 📦 Packages updated

- @expo/config-plugins@1.0.21
- @expo/config@3.3.31
- @expo/dev-server@0.1.57
- @expo/dev-tools@0.13.85
- @expo/electron-adapter@0.0.48
- expo-cli@4.3.0
- expo-optimize@0.1.79
- @expo/metro-config@0.1.57
- @expo/next-adapter@2.1.62
- expo-pwa@0.0.67
- uri-scheme@1.0.68
- @expo/webpack-config@0.12.61
- @expo/xdl@59.0.25

## [Wed, 24 Feb 2021 16:05:57 -0800](https://github.com/expo/expo-cli/commit/dd38f7d9c4d218ac6d408c748f2e2f6cde605b7a)

### 🛠 Breaking changes

### 🎉 New features

- [prebuild] Skip overwriting modules that are symlinked ([#3257](https://github.com/expo/expo-cli/issues/3257))
- [cli] Added method profiler helper function ([#3258](https://github.com/expo/expo-cli/issues/3258))
- [eject] Added prompt to clear malformed projects ([#3256](https://github.com/expo/expo-cli/issues/3256))

### 🐛 Bug fixes

- [cli] Fix double printing `?` command on web
- [cli] Use a more focused babel preset for app.config.js ([#3208](https://github.com/expo/expo-cli/issues/3208))
- [cli] Newline after full log output and skip newline before help output ([#3259](https://github.com/expo/expo-cli/issues/3259))
- [publish] silence workflow warning in 41 ([#3249](https://github.com/expo/expo-cli/issues/3249))
- [xdl] fix unhandled JS exception if no foregroundImage defined for adaptive icon ([#3229](https://github.com/expo/expo-cli/issues/3229))
- [xdl] Update node-forge ([#3252](https://github.com/expo/expo-cli/issues/3252))

### 📦 Packages updated

- @expo/config-plugins@1.0.20
- @expo/config@3.3.30
- @expo/dev-server@0.1.56
- @expo/dev-tools@0.13.84
- @expo/electron-adapter@0.0.47
- expo-cli@4.2.1
- expo-optimize@0.1.78
- @expo/metro-config@0.1.56
- @expo/next-adapter@2.1.61
- expo-pwa@0.0.66
- uri-scheme@1.0.67
- @expo/webpack-config@0.12.60
- @expo/xdl@59.0.24

## [Fri, 19 Feb 2021 11:46:06 -0800](https://github.com/expo/expo-cli/commit/3aff32603996f381482bc6c3239e6f70bf098b70)

### 🛠 Breaking changes

- [cli] redesign startup logs ([#3209](https://github.com/expo/expo-cli/issues/3209))
- [json-file] Remove undocumented support for multi-part keys in `getAsync` and `setAsync` ([#3019](https://github.com/expo/expo-cli/pulls/3019))
- [xdl] Remove Project methods `getLatestReleaseAsync`, `findReusableBuildAsync`, `getBuildStatusAsync`, `startBuildAsync` ([#3187](https://github.com/expo/expo-cli/pulls/3187))
- [xdl] Remove Project types `BuildCreatedResult`, `TurtleMode`, `BuildJobFields`, `BuildStatusResult` ([#3187](https://github.com/expo/expo-cli/pulls/3187))

### 🎉 New features

- [configure-splash-screen] Remove @react-native-community/cli-tools ([#3178](https://github.com/expo/expo-cli/issues/3178))
- [cli] deprecate .expo extension for start command ([#3216](https://github.com/expo/expo-cli/issues/3216))
- [cli] Improve server stopping ([#3210](https://github.com/expo/expo-cli/issues/3210))
- [cli] Combine stop methods ([#3237](https://github.com/expo/expo-cli/issues/3237))
- [cli] Persist dev tools preference ([#3207](https://github.com/expo/expo-cli/issues/3207))
- [cli] Added profiling ([#3217](https://github.com/expo/expo-cli/issues/3217))
- [cli] Added clear flag to expo export ([#3205](https://github.com/expo/expo-cli/issues/3205))
- [cli] Improve keytool errors when not installed ([#3190](https://github.com/expo/expo-cli/issues/3190))
- [xdl] Use devcert fork to reduce install size ([#3175](https://github.com/expo/expo-cli/issues/3175))
- [xdl] Add Dev Client simulator flow v0 for Android devices ([#3194](https://github.com/expo/expo-cli/issues/3194))
- [xdl] Allow dev client apps to be launched in the iOS simulator ([#3182](https://github.com/expo/expo-cli/issues/3182))

### 🐛 Bug fixes

- [cli][prebuild] Clean up debug error messages ([#3201](https://github.com/expo/expo-cli/issues/3201))
- [cli] Cancel upgrade command on ctrl+c within prompt ([#3188](https://github.com/expo/expo-cli/issues/3188))
- [config-plugins] fix detecting application target ([#3215](https://github.com/expo/expo-cli/issues/3215))
- [next-adapter]: Move @types/next to devDependencies ([#3238](https://github.com/expo/expo-cli/issues/3238))
- [xdl] refactor start command folder ([#3186](https://github.com/expo/expo-cli/issues/3186))
- [xdl] split up Project module ([#3164](https://github.com/expo/expo-cli/issues/3164))
- [webpack-config] Update web index.html to fix the screen height in the web when the statusBar is transparent ([#3199](https://github.com/expo/expo-cli/issues/3199))
- [webpack-config] Fixed support for disabling automatic manifest.json tag injection ([#3189](https://github.com/expo/expo-cli/issues/3189))

### 📦 Packages updated

- @expo/config-plugins@1.0.19
- @expo/config@3.3.29
- @expo/dev-server@0.1.55
- @expo/dev-tools@0.13.83
- @expo/electron-adapter@0.0.46
- expo-cli@4.2.0
- expo-optimize@0.1.77
- @expo/metro-config@0.1.55
- @expo/next-adapter@2.1.60
- expo-pwa@0.0.65
- uri-scheme@1.0.66
- @expo/webpack-config@0.12.59
- @expo/xdl@59.0.23

## [Mon, 1 Feb 2021 21:22:35 -0800](https://github.com/expo/expo-cli/commit/d7b35c0c8bca99d3a5ea6ea1599d1a3c254f3d40)

### 🛠 Breaking changes

- [cli] Drop `nodeModulesPath` support (only known use was in former Expo monorepo) ([#3141](https://github.com/expo/expo-cli/issues/3141))

### 🎉 New features

- [xdl] Automatically fall back to offline mode when manifest can't be signed. ([#3148](https://github.com/expo/expo-cli/pull/3148))

### 🐛 Bug fixes

- [cli] fix init visual regresion ([#3173](https://github.com/expo/expo-cli/issues/3173))
- [config-plugins] Rename `IOSConfig.BundleIdenitifer` to `IOSConfig.BundleIdentifier` ([#3161](https://github.com/expo/expo-cli/issues/3161))

### 📦 Packages updated

- @expo/config-plugins@1.0.18
- @expo/config@3.3.28
- @expo/dev-server@0.1.54
- @expo/dev-tools@0.13.82
- @expo/electron-adapter@0.0.45
- expo-cli@4.1.6
- expo-optimize@0.1.76
- @expo/json-file@8.2.27
- @expo/metro-config@0.1.54
- @expo/next-adapter@2.1.59
- @expo/package-manager@0.0.38
- pod-install@0.1.18
- expo-pwa@0.0.64
- @expo/schemer@1.3.26
- uri-scheme@1.0.65
- @expo/webpack-config@0.12.58
- @expo/xdl@59.0.22

## [Tue, 01 Feb 2021 08:55:22 -0800](https://github.com/expo/expo-cli/commit/51c6adb941b74df413834ab3ae3f2578e336d60d)

### 🛠 Breaking changes

### 🎉 New features

### 🐛 Bug fixes

- [xdl] Define max content and body lengths in Axios 0.21 ([#3162](https://github.com/expo/expo-cli/pull/3162))

### 📦 Packages updated

- @expo/dev-tools@0.13.81
- expo-cli@4.1.5
- @expo/xdl@59.0.21

## [Tue, 26 Jan 2021 18:21:34 -0800](https://github.com/expo/expo-cli/commit/ee77eaa57684c3ac496eae24b5e10b8acb6b6e32)

### 🛠 Breaking changes

### 🎉 New features

### 🐛 Bug fixes

- [xdl] Fix flicker when switching to tunnel connection due to null urlType

### 📦 Packages updated

- @expo/dev-tools@0.13.79
- expo-cli@4.1.3
- @expo/xdl@59.0.19

## [Tue, 26 Jan 2021 17:34:40 -0800](https://github.com/expo/expo-cli/commit/c9a57c31bc2309de5c8ddfa13986209c5dffcecf)

### 🛠 Breaking changes

### 🎉 New features

- [xdl] Use global ngrok for xdl ([#3123](https://github.com/expo/expo-cli/issues/3123))
- [configure-splash-screen] publish @expo/configure-splash-screen

### 🐛 Bug fixes

- [cli] prevent throwing duplicate warning ([#3130](https://github.com/expo/expo-cli/issues/3130))
- [cli] Auto-login when envvars are defined ([#3127](https://github.com/expo/expo-cli/issues/3127))
- [cli] Improve handling of no answer for customize:web ([#3128](https://github.com/expo/expo-cli/issues/3128))
- [xdl] Support Expo Go name in shellapp template ([#3125](https://github.com/expo/expo-cli/issues/3125))

### 📦 Packages updated

- @expo/config-plugins@1.0.17
- @expo/config@3.3.26
- @expo/dev-server@0.1.52
- @expo/dev-tools@0.13.78
- @expo/electron-adapter@0.0.43
- expo-cli@4.1.2
- expo-optimize@0.1.74
- @expo/metro-config@0.1.52
- @expo/next-adapter@2.1.57
- @expo/package-manager@0.0.36
- pod-install@0.1.16
- expo-pwa@0.0.62
- uri-scheme@1.0.63
- @expo/webpack-config@0.12.56
- @expo/xdl@59.0.18

## [Mon, 25 Jan 2021 11:50:33 -0800](https://github.com/expo/expo-cli/commit/ded0c2af2180d76dd9f420f00b92b5167ab52312)

### 🛠 Breaking changes

- [cli] Open signup page in browser instead of CLI-based registration
- [config] Only use wasm on web platforms ([#3100](https://github.com/expo/expo-cli/issues/3100))

### 🎉 New features

- [cli] Auto configure TypeScript ([#3096](https://github.com/expo/expo-cli/issues/3096))
- [cli] Use the versions endpoint for TypeScript packages ([#3109](https://github.com/expo/expo-cli/issues/3109))
- [cli] Copy over EAS Apple API methods ([#3113](https://github.com/expo/expo-cli/issues/3113))
- [cli] add --experimental-bundle flag to 'export' command ([#3074](https://github.com/expo/expo-cli/issues/3074))
- [config-plugins] improve monorepo support - fix setting path to create-manifest-\* script ([#3103](https://github.com/expo/expo-cli/issues/3103))
- [config-plugins] export more types from config-plugins ([#3083](https://github.com/expo/expo-cli/issues/3083))
- [metro-config] Enable allowOptionalDependencies by default ([#3088](https://github.com/expo/expo-cli/issues/3088))
- [xdl] improve simulator errors ([#3104](https://github.com/expo/expo-cli/issues/3104))

### 🐛 Bug fixes

- [cli] Check for optional `devDependencies` ([#3121](https://github.com/expo/expo-cli/issues/3121))
- [cli] Validate project owner when publishing ([#3061](https://github.com/expo/expo-cli/issues/3061))
- [cli] Remove EAS Build related code ([#3079](https://github.com/expo/expo-cli/issues/3079))
- [cli] add option to assign created push key to current project ([#3098](https://github.com/expo/expo-cli/issues/3098))
- [cli] Only change react-native version when it's a fork ([#3097](https://github.com/expo/expo-cli/issues/3097))
- [cli] remove lottie extra step warning ([#3099](https://github.com/expo/expo-cli/issues/3099))
- [cli] improvement: Handle keychain save error ([#3067](https://github.com/expo/expo-cli/issues/3067))
- [config-plugins] Prevent adding duplicate Xcode references for files ([#3107](https://github.com/expo/expo-cli/issues/3107))
- [config-plugins] Fix app gradle versionName replacement after ejecting twice ([#3082](https://github.com/expo/expo-cli/issues/3082))
- [xdl] fix expo export --dump-sourcemap for sdk 40+ and bare projects ([#3095](https://github.com/expo/expo-cli/issues/3095))

### 📦 Packages updated

- @expo/config-plugins@1.0.15
- @expo/config@3.3.24
- @expo/dev-server@0.1.50
- @expo/dev-tools@0.13.76
- @expo/electron-adapter@0.0.41
- expo-cli@4.1.0
- expo-optimize@0.1.72
- @expo/metro-config@0.1.50
- @expo/next-adapter@2.1.55
- expo-pwa@0.0.60
- uri-scheme@1.0.61
- @expo/webpack-config@0.12.54
- @expo/xdl@59.0.16

## [Thu Jan 14 14:34:05 2021 +0100](https://github.com/expo/expo-cli/commit/e8dfcc425fa8128aeaf21fb8bbba6760dc196fcf)

### 🛠 Breaking changes

- [cli] Environment variables matching `EXPO_` or `REACT_NATIVE_` are no longer exposed publicly to the development-mode app or website ([#3063](https://github.com/expo/expo-cli/issues/3063))
- [cli] Remove EAS Build code, it now lives in `eas-cli` ([#3079](https://github.com/expo/expo-cli/pull/3079))

### 🎉 New features

- [config-plugins] ProvisioningProfile: allow setting provisioning profile for a particular target (not only for the first one)

### 📦 Packages updated

- @expo/config-plugins@1.0.14
- @expo/config@3.3.23
- @expo/dev-server@0.1.49
- @expo/dev-tools@0.13.75
- @expo/electron-adapter@0.0.40
- expo-cli@4.0.18
- expo-codemod@1.0.30
- expo-optimize@0.1.71
- @expo/image-utils@0.3.10
- @expo/metro-config@0.1.49
- @expo/next-adapter@2.1.54
- expo-pwa@0.0.59
- uri-scheme@1.0.60
- @expo/webpack-config@0.12.53
- @expo/xdl@59.0.15

## [Sun, 27 Dec 2020 13:14:17 -0800](https://github.com/expo/expo-cli/commit/a14f18284efda89a08910d5a753b1749897f54a2)

### 🛠 Breaking changes

- [cli] Mark expo upload:ios as unsupported ([#3030](https://github.com/expo/expo-cli/issues/3030))

### 📦 Packages updated

- expo-cli@4.0.17

## [Mon, 21 Dec 2020 18:18:20 -0800](https://github.com/expo/expo-cli/commit/62339b5fb7300569ca6cbb034251070bf8a63999)

### 🛠 Breaking changes

- [xdl] Update iOS deployment target in ejected Podfile (internal)

### 🎉 New features

- [xdl][dev-tools][cli] Update --dev-client for new requirements ([#2938](https://github.com/expo/expo-cli/issues/2938))

### 📦 Packages updated

- @expo/dev-server@0.1.48
- @expo/dev-tools@0.13.74
- kkexpo-cli@4.0.16
- @expo/metro-config@0.1.48
- @expo/xdl@59.0.14

## [Mon, 14 Dec 2020 20:47:39 -0800](https://github.com/expo/expo-cli/commit/ad6570659b8ad9fccdec8c79791b6f5d6578b824)

### 🐛 Bug fixes

- [configure-splash-screen][config-plugins] Bump @expo/configure-splash-screen
- [configure-splash-screen] Remove peer dependency
- [english] effect -> affect ([#3013](https://github.com/expo/expo-cli/issues/3013))

### 📦 Packages updated

- @expo/config-plugins@1.0.12
- @expo/dev-tools@0.13.72
- expo-cli@4.0.14
- uri-scheme@1.0.58
- @expo/xdl@59.0.12

## [Wed, 9 Dec 2020 17:12:12 -0800](https://github.com/expo/expo-cli/commit/cbbfa68a6eac9639b4217a9bcc0ca3ce30eb1378)

### 🐛 Bug fixes

- [cli][xdl] Clear versions cache when running expo upgrade, to be safe
- [config] fix mod serialization ([#3008](https://github.com/expo/expo-cli/issues/3008))
- [config-plugins] use env variable for debug when \_internal isn't defined ([#3011](https://github.com/expo/expo-cli/issues/3011))

### 📦 Packages updated

- @expo/config-plugins@1.0.11
- @expo/config@3.3.21
- @expo/dev-server@0.1.46
- @expo/dev-tools@0.13.71
- @expo/electron-adapter@0.0.38
- expo-cli@4.0.13
- expo-optimize@0.1.69
- @expo/metro-config@0.1.46
- @expo/next-adapter@2.1.52
- expo-pwa@0.0.57
- uri-scheme@1.0.57
- @expo/webpack-config@0.12.51
- @expo/xdl@59.0.11

## [Tue, 8 Dec 2020 18:21:57 -0800](https://github.com/expo/expo-cli/commit/a875d06d4ab529ff9b4e7fe570692a47bf46f1b6)

### 🎉 New features

- [cli] Add expo-random when upgrading to >= SDK 40 with expo-auth-session
- [cli] Add cmd.exe detection on windows & warn about it ([#2838](https://github.com/expo/expo-cli/issues/2838))
- [cli] Skip warning about expo-constants when ejecting in SDK 40 and greater ([#3006](https://github.com/expo/expo-cli/issues/3006))
- [xdl] Add robots as new supported user type ([#2440](https://github.com/expo/expo-cli/issues/2440))

### 📦 Packages updated

- @expo/dev-tools@0.13.70
- expo-cli@4.0.12
- @expo/xdl@59.0.10

## [Mon, 7 Dec 2020 22:27:44 -0800](https://github.com/expo/expo-cli/commit/3fb08fdff7a03fb49a1f2ddc6d968ceb14be9519)

### 🎉 New features

- [config-plugins] Added support for static plugins ([#2943](https://github.com/expo/expo-cli/issues/2943))
- [config-plugins] Support splash screen config on SDK 40 ([#3003](https://github.com/expo/expo-cli/issues/3003))
- [config-plugins] added method for adding frameworks ([#2997](https://github.com/expo/expo-cli/issues/2997))

### 🐛 Bug fixes

- [xdl] Check for client updates for the given sdk version by default
- [cli] fix windows post install message
- [cli] Use unified website route for all builds (no more /v2) ([#2995](https://github.com/expo/expo-cli/issues/2995))

### 📦 Packages updated

- @expo/config-plugins@1.0.10
- @expo/config@3.3.20
- @expo/dev-server@0.1.45
- @expo/dev-tools@0.13.69
- @expo/electron-adapter@0.0.37
- expo-cli@4.0.11
- expo-optimize@0.1.68
- @expo/metro-config@0.1.45
- @expo/next-adapter@2.1.51
- pod-install@0.1.14
- expo-pwa@0.0.56
- @expo/schemer@1.3.23
- uri-scheme@1.0.56
- @expo/webpack-config@0.12.50
- @expo/xdl@59.0.9

## [Fri, 4 Dec 2020 10:38:20 -0800](https://github.com/expo/expo-cli/commit/65cb9a64cfa4cc6fb89bdc2a432acd16c6043def)

### 🎉 New features

- [cli] Added ability to skip platforms when ejecting ([#2988](https://github.com/expo/expo-cli/issues/2988))
- [cli] Fallback to jest-expo@sdkVersion-beta when using beta sdk if not otherwise defined ([#2985](https://github.com/expo/expo-cli/issues/2985))
- [cli] Update supported Node version ranges
- [xdl] Install the client version for the given SDK by default when opening project ([#2986](https://github.com/expo/expo-cli/issues/2986))

### 📦 Packages updated

- @expo/config-plugins@1.0.7
- @expo/dev-tools@0.13.66
- expo-cli@4.0.8
- uri-scheme@1.0.53
- @expo/xdl@59.0.6

## [Tue, 1 Dec 2020 16:30:17 -0800](https://github.com/expo/expo-cli/commit/bc951645e2b7771ad2c2e81dbb50d1ffa7b22dc1)

### 🛠 Breaking changes

### 🎉 New features

### 🐛 Bug fixes

- [cli] Fix installing client for selected target SDK version in upgrade ([#2981](https://github.com/expo/expo-cli/issues/2981))

### 📦 Packages updated

- @expo/config-plugins@1.0.6
- expo-cli@4.0.7
- uri-scheme@1.0.52

## [Mon, 30 Nov 2020 15:41:46 -0800](https://github.com/expo/expo-cli/commit/d68bfc944016efa0c553109ffca3d3222b1a92ac)

### 🛠 Breaking changes

### 🎉 New features

- [config-plugins] Add withInternal plugin ([#2975](https://github.com/expo/expo-cli/issues/2975))
- [config-plugins] Created withRunOnce ([#2965](https://github.com/expo/expo-cli/issues/2965))
- [config-plugins] fix isPlistVersionConfigurationSynced condition ([#2974](https://github.com/expo/expo-cli/issues/2974))

### 🐛 Bug fixes

- [xdl][cli] Fix beta integration of init ([#2978](https://github.com/expo/expo-cli/issues/2978))

### 📦 Packages updated

- @expo/config-plugins@1.0.5
- @expo/config@3.3.18
- @expo/dev-server@0.1.43
- @expo/dev-tools@0.13.64
- @expo/electron-adapter@0.0.35
- expo-cli@4.0.5
- expo-optimize@0.1.66
- @expo/metro-config@0.1.43
- @expo/next-adapter@2.1.49
- expo-pwa@0.0.54
- uri-scheme@1.0.51
- @expo/webpack-config@0.12.48
- @expo/xdl@59.0.4

## [Sat, 28 Nov 2020 12:49:14 -0800](https://github.com/expo/expo-cli/commit/57ddd2cadfc85b663df7dbb23dc442b9d5803b7c)

### 🎉 New features

- [config] fill \_internal object ([#2968](https://github.com/expo/expo-cli/issues/2968))

### 🐛 Bug fixes

- [cli] Fix register command and some cleanup on messaging ([#2971](https://github.com/expo/expo-cli/issues/2971))

### 📦 Packages updated

- @expo/config-plugins@1.0.4
- @expo/config@3.3.17
- @expo/dev-server@0.1.42
- @expo/dev-tools@0.13.63
- @expo/electron-adapter@0.0.34
- expo-cli@4.0.4
- expo-optimize@0.1.65
- @expo/metro-config@0.1.42
- @expo/next-adapter@2.1.48
- expo-pwa@0.0.53
- uri-scheme@1.0.50
- @expo/webpack-config@0.12.47
- @expo/xdl@59.0.3

## [Fri, 27 Nov 2020 14:33:45 -0800](https://github.com/expo/expo-cli/commit/7bb61ba51da0eafce3faa8cbf59124f56ebe7e7d)

### 🎉 New features

- [image-utils] Upgraded jimp to the smaller version ([#2963](https://github.com/expo/expo-cli/issues/2963))
- [cli] Make it possible to run expo upgrade with beta release prior to actually setting beta flag ([#2967](https://github.com/expo/expo-cli/issues/2967))

### 📦 Packages updated

- @expo/config-plugins@1.0.3
- @expo/dev-tools@0.13.62
- @expo/electron-adapter@0.0.33
- expo-cli@4.0.3
- expo-optimize@0.1.64
- @expo/image-utils@0.3.9
- @expo/next-adapter@2.1.47
- expo-pwa@0.0.52
- uri-scheme@1.0.49
- @expo/webpack-config@0.12.46
- @expo/xdl@59.0.2

## [Fri, 27 Nov 2020 10:31:00 -0800](https://github.com/expo/expo-cli/commit/939de8ba6eb90979f7975de5ae2197208319773b)

### 🛠 Breaking changes

### 🎉 New features

### 🐛 Bug fixes

- [cli] fix prompt selection ([#2966](https://github.com/expo/expo-cli/issues/2966))

### 📦 Packages updated

- expo-cli@4.0.2

## [Thu, 26 Nov 2020 16:54:28 -0800](https://github.com/expo/expo-cli/commit/1995c2f93d03a733480d95f22145170622158b01)

### 🛠 Breaking changes

### 🎉 New features

### 🐛 Bug fixes

- [cli] Disable strikethrough in expo-cli select prompts
- [config] Run splash first config in dangerous configs to fix race condition ([#2959](https://github.com/expo/expo-cli/issues/2959))

### 📦 Packages updated

- @expo/config-plugins@1.0.2
- @expo/dev-tools@0.13.61
- expo-cli@4.0.1
- uri-scheme@1.0.48
- @expo/xdl@59.0.1

## [Thu, 26 Nov 2020 12:25:12 -0800](https://github.com/expo/expo-cli/commit/a69fdfdcda48ca1ebf09b1e862fe84043f569d9d)

### 🛠 Breaking changes

- [cli] Removed `generate-module` command ([#2903](https://github.com/expo/expo-cli/pull/2903))
- [cli] Use submission service by default ([#2876](https://github.com/expo/expo-cli/issues/2876))
- [cli] Delete apply command in favor of eject. Don't worry, you probably were not using this command anyways. ([#2899](https://github.com/expo/expo-cli/issues/2899))

### 🎉 New features

- [cli] Record simctl error ([#2887](https://github.com/expo/expo-cli/issues/2887))
- [cli] Replace process.exits with errors ([#2901](https://github.com/expo/expo-cli/issues/2901))
- [cli] Support grouping and hiding in the introspect script ([#2931](https://github.com/expo/expo-cli/issues/2931))
- [cli] debug logging ([#2946](https://github.com/expo/expo-cli/issues/2946))
- [config plugins] Implement debug logging for mods ([#2950](https://github.com/expo/expo-cli/issues/2950))
- [config plugins] Prevent passing a plugin that requires props without props ([#2937](https://github.com/expo/expo-cli/issues/2937))
- [config plugins] Support updating the project settings.gradle name ([#2955](https://github.com/expo/expo-cli/issues/2955))
- [config plugins] base mod improvements ([#2948](https://github.com/expo/expo-cli/issues/2948))
- [config plugins] name all config plugins ([#2949](https://github.com/expo/expo-cli/issues/2949))
- [config-plugins] create package ([#2956](https://github.com/expo/expo-cli/issues/2956))
- [config] add option to get public expo config method ([#2863](https://github.com/expo/expo-cli/issues/2863))
- [config] android plugins ([#2849](https://github.com/expo/expo-cli/issues/2849))
- [deps] remove inquirer
- [deps] upgrade react-dev-utils to 11.0.1 ([#2906](https://github.com/expo/expo-cli/issues/2906))
- [deps] upgrade to bunyan 4.0.0 ([#2920](https://github.com/expo/expo-cli/issues/2920))
- [web] Improve PWA warning ([#2907](https://github.com/expo/expo-cli/issues/2907))
- [web] promote web warning to late beta ([#2889](https://github.com/expo/expo-cli/issues/2889))
- [xdl] Switch to in-process Metro JS bundling through `@expo/dev-server` starting from SDK 40 ([#2921](https://github.com/expo/expo-cli/pull/2921))

### 🐛 Bug fixes

- [actions] Upgrade cache to v2 ([#2872](https://github.com/expo/expo-cli/issues/2872))
- [cli] Fix build/status return types ([#2915](https://github.com/expo/expo-cli/issues/2915))
- [cli] Replace inquirer with prompts in init ([#2905](https://github.com/expo/expo-cli/issues/2905))
- [cli] Resolve main fields to determine if an index.js should be generated ([#2874](https://github.com/expo/expo-cli/issues/2874))
- [cli] delete generate-module ([#2903](https://github.com/expo/expo-cli/issues/2903))
- [cli][upgrade] support projects without a config ([#2888](https://github.com/expo/expo-cli/issues/2888))
- [config plugins] Enable notifications by default ([#2958](https://github.com/expo/expo-cli/issues/2958))
- [config plugins] add files to 'copy bundle resources', not 'compile sources' build phase ([#2936](https://github.com/expo/expo-cli/issues/2936))
- [config] permissions plugins ([#2871](https://github.com/expo/expo-cli/issues/2871))
- [config][xdl] migrate project/publish to getPublicExpoConfig ([#2864](https://github.com/expo/expo-cli/issues/2864))
- [eject] Added more packages with extra setup ([#2870](https://github.com/expo/expo-cli/issues/2870))
- [image-utils] Fix blurry web favicon ([#2914](https://github.com/expo/expo-cli/issues/2914))
- [traveling-fastlane] add slightly modified manage_provisioning_profile ([#2928](https://github.com/expo/expo-cli/issues/2928))
- [xdl] On Android remove default template splash image when no splash image is specified in the app manifest ([#2883](https://github.com/expo/expo-cli/pull/2883))
- [xdl] Switch to in-process Metro JS bundling starting from SDK 40 ([#2921](https://github.com/expo/expo-cli/issues/2921))
- [xdl] Update web terminal UI ([#2890](https://github.com/expo/expo-cli/issues/2890))

### 📦 Packages updated

- @expo/config-plugins@1.0.1
- @expo/config@3.3.16
- @expo/dev-server@0.1.41
- @expo/dev-tools@0.13.60
- @expo/electron-adapter@0.0.32
- expo-cli@4.0.0
- expo-optimize@0.1.63
- @expo/image-utils@0.3.8
- @expo/json-file@8.2.25
- @expo/metro-config@0.1.41
- @expo/next-adapter@2.1.46
- @expo/package-manager@0.0.34
- pod-install@0.1.13
- expo-pwa@0.0.51
- @expo/schemer@1.3.22
- uri-scheme@1.0.47
- @expo/webpack-config@0.12.45
- @expo/xdl@59.0.0

## [Thu Nov 26 12:36:20 2020 +0100](https://github.com/expo/expo-cli/commit/5c432616d39fe0a8894b50d2e613284674a536e1)

### 🐛 Bug fixes

- [configure-splash-screen] On iOS fix auto-configuration when there's no PBXVariantGroup in the project ([#2945](https://github.com/expo/expo-cli/pull/2945))

### 📦 Packages updated

- @expo/configure-splash-screen@0.3.1

## [Mon, 9 Nov 2020 13:44:59 -0800](https://github.com/expo/expo-cli/commit/d5b8759b32d5a7747067a969728d9ba732926824)

### 🛠 Breaking changes

### 🎉 New features

- [cli] Added support for a custom scheme property ([#2860](https://github.com/expo/expo-cli/issues/2860))
- [cli] Clarify the experimental nature of the --dev-client flag
- [cli] Created scheme resolver for dev-client ([#2861](https://github.com/expo/expo-cli/issues/2861))
- [uri-scheme] sort Info.plist files by length ([#2859](https://github.com/expo/expo-cli/issues/2859))

### 🐛 Bug fixes

- [xdl] speed improvement - remove extra config read when resolving entry point ([#2836](https://github.com/expo/expo-cli/issues/2836))
- [xdl] fix updates ON_ERROR_RECOVERY setting for SDK 39 ([#2856](https://github.com/expo/expo-cli/issues/2856))

### 📦 Packages updated

- @expo/config@3.3.15
- @expo/dev-server@0.1.40
- @expo/dev-tools@0.13.59
- @expo/electron-adapter@0.0.31
- expo-cli@3.28.6
- expo-optimize@0.1.62
- @expo/metro-config@0.1.40
- @expo/next-adapter@2.1.45
- expo-pwa@0.0.50
- uri-scheme@1.0.46
- @expo/webpack-config@0.12.44
- @expo/xdl@58.0.20

## [Wed, 4 Nov 2020 19:04:11 -0800](https://github.com/expo/expo-cli/commit/4a29c163952ea8f4a27e3621b2aa08fce164923e)

### 🛠 Breaking changes

### 🎉 New features

- [xdl][cli] <feat>: Add READMEs to the .expo & .expo-shared folders ([#2830](https://github.com/expo/expo-cli/issues/2830))

### 🐛 Bug fixes

- [configure-splash-screen] Use proper bin paths to files ([#2840](https://github.com/expo/expo-cli/issues/2840))
- [config] android fixes ([#2851](https://github.com/expo/expo-cli/issues/2851))
- [config] iOS fix types ([#2852](https://github.com/expo/expo-cli/issues/2852))
- [config] Updated Android Facebook module to better accommodate plugins ([#2848](https://github.com/expo/expo-cli/issues/2848))
- [pkcs12] add fingerprint support for unparseable x509 certs ([#2854](https://github.com/expo/expo-cli/issues/2854))
- [traveling-fastlane] publish 1.15.2
- [travelling-fastlane] Update app_produce to return App ID ([#2855](https://github.com/expo/expo-cli/issues/2855))

### 📦 Packages updated

- @expo/config@3.3.14
- @expo/dev-server@0.1.39
- @expo/dev-tools@0.13.58
- @expo/electron-adapter@0.0.30
- expo-cli@3.28.5
- expo-optimize@0.1.61
- @expo/metro-config@0.1.39
- @expo/next-adapter@2.1.44
- @expo/pkcs12@0.0.4
- expo-pwa@0.0.49
- uri-scheme@1.0.45
- @expo/webpack-config@0.12.43
- @expo/xdl@58.0.19

## [Tue, 3 Nov 2020 10:49:55 -0800](https://github.com/expo/expo-cli/commit/de4124a9cfc50715e0c9748151dfdbe254e57074)

### 🛠 Breaking changes

### 🎉 New features

- [config] config plugins iOS ([#2789](https://github.com/expo/expo-cli/issues/2789))

### 🐛 Bug fixes

- [cli] Use exact @expo/eas-build-job version, update it, and fix related TS errors ([#2850](https://github.com/expo/expo-cli/issues/2850))
- [cli] Fix eas gradle script not working when used with react-native-config
- [config] Force entitlement paths to be in posix ([#2841](https://github.com/expo/expo-cli/issues/2841))

### 📦 Packages updated

- @expo/config@3.3.13
- @expo/dev-server@0.1.38
- @expo/dev-tools@0.13.57
- @expo/electron-adapter@0.0.29
- expo-cli@3.28.4
- expo-optimize@0.1.60
- @expo/metro-config@0.1.38
- @expo/next-adapter@2.1.43
- expo-pwa@0.0.48
- uri-scheme@1.0.44
- @expo/webpack-config@0.12.42
- @expo/xdl@58.0.18

## [Thu, 22 Oct 2020 15:31:16 -0700](https://github.com/expo/expo-cli/commit/8def7d96509daf819754b0b7af09e1f3159896c1)

### 🛠 Breaking changes

### 🎉 New features

- [cli] Support --platform option for eas:build:init
- [cli] Update --latest flag help message
- [cli] Validate the credentials for android keystore

### 🐛 Bug fixes

- [cli][xdl] Pass owner through to findReusableBuildAsync
- [xdl] Rename debug to expo raw log to avoid collision ([#2818](https://github.com/expo/expo-cli/issues/2818))

### 📦 Packages updated

- @expo/dev-tools@0.13.55
- expo-cli@3.28.2
- @expo/xdl@58.0.16

## [Mon, 19 Oct 2020 16:43:59 -0700](https://github.com/expo/expo-cli/commit/1062d0bba966500dba751a890938445ee195d919)

### 🎉 New features

- [cli] Add support for --latest flag in client:install:x ([#2804](https://github.com/expo/expo-cli/issues/2804))
- [cli] Add `releaseChannel` field to the profile in `eas.json`
- [config] Created AssetContents ([#2798](https://github.com/expo/expo-cli/issues/2798))
- [config] disjointed features from plugins ios ([#2811](https://github.com/expo/expo-cli/issues/2811))
- [pkcs12] return null if pkcs keystore has no cert under friendly name ([#2805](https://github.com/expo/expo-cli/issues/2805))
- [pkcs12] amend readme with updated method names

### 🐛 Bug fixes

- [config] fix entitlements functionality ([#2797](https://github.com/expo/expo-cli/issues/2797))
- [config] setFacebookConfig needs to be async function due to ensureFacebookActivityAsync
- [cli] Use expo/plist instead of xdl IosPlist ([#2799](https://github.com/expo/expo-cli/issues/2799))
- [cli] Fix custom Expo client build ([#2796](https://github.com/expo/expo-cli/issues/2796))

### 📦 Packages updated

- @expo/config@3.3.11
- @expo/dev-server@0.1.36
- @expo/dev-tools@0.13.54
- @expo/electron-adapter@0.0.27
- expo-cli@3.28.1
- expo-optimize@0.1.58
- @expo/metro-config@0.1.36
- @expo/next-adapter@2.1.41
- @expo/pkcs12@0.0.2
- expo-pwa@0.0.46
- uri-scheme@1.0.42
- @expo/webpack-config@0.12.40
- @expo/xdl@58.0.15

## [Wed, 14 Oct 2020 14:27:23 -0700](https://github.com/expo/expo-cli/commit/0fde837f6024c2cd53e089df894063b3f4b38ca2)

### 🎉 New features

- [configure-splash-screen] Added `--version, -V` option for version printing. ([#2785](https://github.com/expo/expo-cli/pull/2785))
- [pkcs12] new package for PKCS#12 utilities ([#2773](https://github.com/expo/expo-cli/issues/2773))
- [config] Created paths module for ios ([#2784](https://github.com/expo/expo-cli/issues/2784))
- [cli] Skip ejecting iOS on Windows - this doesn't work properly at the moment, so we instead encourage people to use macOS or Linux for ejecting the iOS project.
- [cli] Update expo.io URLs used in expo-cli to match changes to the website ([#2767](https://github.com/expo/expo-cli/issues/2767))

### 🐛 Bug fixes

- [cli] Fix parallel uploads ([#2736](https://github.com/expo/expo-cli/issues/2736))
- [cli] Add "client" copy to Android and iOS open option ([#2778](https://github.com/expo/expo-cli/issues/2778))
- [cli] Add a EAS_OUTPUT_JOB_JSON environment variable to output JSON for the job
- [cli] Update Android install/uninstall copy ([#2763](https://github.com/expo/expo-cli/issues/2763))
- [cli] Disable error message when aborting ([#2751](https://github.com/expo/expo-cli/issues/2751))
- [cli] use correct description for openDevToolsAtStartup in the ? message ([#2755](https://github.com/expo/expo-cli/issues/2755))
- [config] minor plugin updates ([#2788](https://github.com/expo/expo-cli/issues/2788))
- [config] Fix Android scandir error when ejecting on windows ([#2774](https://github.com/expo/expo-cli/issues/2774))

### 📦 Packages updated

- @expo/config@3.3.10
- @expo/configure-splash-screen@0.3.0
- @expo/dev-server@0.1.35
- @expo/dev-tools@0.13.53
- @expo/electron-adapter@0.0.26
- expo-cli@3.28.0
- expo-optimize@0.1.57
- @expo/metro-config@0.1.35
- @expo/next-adapter@2.1.40
- @expo/pkcs12@0.0.1
- expo-pwa@0.0.45
- uri-scheme@1.0.41
- @expo/webpack-config@0.12.39
- @expo/xdl@58.0.14

## [Sat, 3 Oct 2020 22:11:17 -0700](https://github.com/expo/expo-cli/commit/6d8f7c734f501b9f194d232df7a0f65d9b9415e7)

### 🛠 Breaking changes

### 🎉 New features

### 🐛 Bug fixes

- [xdl] Revert regex replace for < SDK 39 splash screen
- [expo-cli] Disable TerminalUI sign in/out method (s) ([#2752](https://github.com/expo/expo-cli/issues/2752))

### 📦 Packages updated

- @expo/dev-tools@0.13.52
- expo-cli@3.27.14
- @expo/xdl@58.0.13

## [Fri, 2 Oct 2020 11:17:40 -0700](https://github.com/expo/expo-cli/commit/b02ce39f257045aa512ead62bdffa3a766a02c97)

### 🛠 Breaking changes

### 🎉 New features

- [cli] Add two-factor authentication to login ([#2581](https://github.com/expo/expo-cli/issues/2581))
- [cli] Make `expo install` pass through to npm or yarn directly when running it in a bare React Native app without the expo package installed. ([#2729](https://github.com/expo/expo-cli/issues/2729))
- [cli] EAS Build: Configure `expo-updates` automatically if it's installed when running `eas:build:init` [#2587](https://github.com/expo/expo-cli/pull/2587)
- [cli] Support absolute path in credentials.json for gradle

### 🐛 Bug fixes

- [config] Fix relative module resolution for config files ([#2744](https://github.com/expo/expo-cli/issues/2744))
- [configure-splash-screen] don't export color-string types ([#2739](https://github.com/expo/expo-cli/issues/2739))
- [cli] Fix simulator picking when multiple device versions exist ([#2742](https://github.com/expo/expo-cli/issues/2742))
- [cli] Fix EXPO_DEBUG on expo upgrade
- [cli] Fix command help options order ([#2721](https://github.com/expo/expo-cli/issues/2721))
- [xdl] Add support for splash screen SDK-39 standalone app configuration & building ([#2747](https://github.com/expo/expo-cli/issues/2747))

### 📦 Packages updated

- @expo/config@3.3.9
- @expo/dev-server@0.1.34
- @expo/dev-tools@0.13.51
- @expo/electron-adapter@0.0.25
- expo-cli@3.27.13
- expo-optimize@0.1.56
- @expo/image-utils@0.3.7
- @expo/metro-config@0.1.34
- @expo/next-adapter@2.1.39
- expo-pwa@0.0.44
- uri-scheme@1.0.40
- @expo/webpack-config@0.12.38
- @expo/xdl@58.0.12

## [Mon, 28 Sep 2020 12:02:49 -0700](https://github.com/expo/expo-cli/commit/19e206bdc3973aa5263a11999c9624ef3590b00d)

### 🛠 Breaking changes

- [config-types] remove loading key ([#2722](https://github.com/expo/expo-cli/issues/2722))

### 🎉 New features

- [config-types] Split up platform configs ([#2716](https://github.com/expo/expo-cli/issues/2716))
- [config-types] Rename root config file to ExpoConfig ([#2715](https://github.com/expo/expo-cli/issues/2715))

### 🐛 Bug fixes

- [config-types] android.intentFilters.data type fix ([#2707](https://github.com/expo/expo-cli/issues/2707))
- [cli] Fix typo when JS installation fails on eject ([#2712](https://github.com/expo/expo-cli/issues/2712))
- [cli] Revert "Improved package name validation ([#2687](https://github.com/expo/expo-cli/issues/2687))"
- [cli] Fix link to hashAsseFiles information on eject
- [cli] Remove short form of --count (-count didn't work, -c is taken)
- [cli] Fix windows build compatibility ([#2705](https://github.com/expo/expo-cli/issues/2705))

### 📦 Packages updated

- @expo/config@3.3.7
- @expo/configure-splash-screen@0.2.1
- @expo/dev-server@0.1.32
- @expo/dev-tools@0.13.49
- @expo/electron-adapter@0.0.23
- expo-cli@3.27.11
- expo-optimize@0.1.54
- @expo/metro-config@0.1.32
- @expo/next-adapter@2.1.37
- expo-pwa@0.0.42
- uri-scheme@1.0.38
- @expo/webpack-config@0.12.36
- @expo/xdl@58.0.10

## [Mon, 28 Sep 2020 15:47:29 +0200](https://github.com/expo/expo-cli/commit/3407fb46596c77197b8dd140046a5388026aec36)

### 🎉 New features

- [configure-splash-screen]<feat>: Accommodate Android singletons.SplashScreen import from the subpackage ([#2699](https://github.com/expo/expo-cli/issues/2699))
- [configure-splash-screen]<feat>: Make Android configuration conform to the new native API ([#2698](https://github.com/expo/expo-cli/issues/2698))

## [Thu, 24 Sep 2020 16:18:06 -0700](https://github.com/expo/expo-cli/commit/8443580c8093f28550c7ebbb8d1b66bacc83a201)

### 🛠 Breaking changes

### 🎉 New features

### 🐛 Bug fixes

- [config] Disable splash screen applying on eject until we fix issue with @expo/configure-splash-screen versioning. [#2700](https://github.com/expo/expo-cli/pull/2700).

### 📦 Packages updated

- @expo/config@3.3.6
- @expo/dev-server@0.1.31
- @expo/dev-tools@0.13.48
- @expo/electron-adapter@0.0.22
- expo-cli@3.27.10
- expo-optimize@0.1.53
- @expo/metro-config@0.1.31
- @expo/next-adapter@2.1.36
- expo-pwa@0.0.41
- uri-scheme@1.0.37
- @expo/webpack-config@0.12.35
- @expo/xdl@58.0.9

## [Thu, 24 Sep 2020 15:27:32 -0700](https://github.com/expo/expo-cli/commit/c76d808751c8f20203b0d3555ec3a210a37d0d1d)

### 🎉 New features

- [cli] Improved package name validation ([#2687](https://github.com/expo/expo-cli/issues/2687))
- [cli] Recommend Transporter.app if expo upload:ios fails
- [cli] Only show upload:ios command when build is for an iOS archive
- [config] Created XML module ([#2694](https://github.com/expo/expo-cli/issues/2694))
- [config][eject] Added ios.entitlements ([#2624](https://github.com/expo/expo-cli/issues/2624))
- [config] Created Paths module ([#2695](https://github.com/expo/expo-cli/issues/2695))
- [config] Resolve inline locales ([#2691](https://github.com/expo/expo-cli/issues/2691))
- [config-types] Update for schema changes ([#2690](https://github.com/expo/expo-cli/issues/2690))
- [xdl] use `process.env.METRO_NODE_OPTIONS` when starting Metro ([#2401](https://github.com/expo/expo-cli/issues/2401))

### 🐛 Bug fixes

- [xdl] add export modificator for Project.startExpoServerAsync function ([#2697](https://github.com/expo/expo-cli/issues/2697))

### 📦 Packages updated

- @expo/config@3.3.5
- @expo/dev-server@0.1.30
- @expo/dev-tools@0.13.47
- @expo/electron-adapter@0.0.21
- expo-cli@3.27.9
- expo-optimize@0.1.52
- @expo/metro-config@0.1.30
- @expo/next-adapter@2.1.35
- expo-pwa@0.0.40
- uri-scheme@1.0.36
- @expo/webpack-config@0.12.34
- @expo/xdl@58.0.8

## [Tue, 22 Sep 2020 22:27:01 -0700](https://github.com/expo/expo-cli/commit/877053dc8395e1cd98d2296eccf336d4f7c08f05)

### 🛠 Breaking changes

- [xdl] Deprecated `Project.getManifestUrlWithFallbackAsync()` in favor of `UrlUtils.constructManifestUrlAsync()`. [#2684](https://github.com/expo/expo-cli/pull/2684)
- [xdl] Deprecated `Project.getUrlAsync()` in favor of `UrlUtils.constructManifestUrlAsync()`. [#2684](https://github.com/expo/expo-cli/pull/2684)
- [xdl] Removed `Project.getSlugAsync()`, `Project.stopTunnelsAsync()`, `Project.startExpoServerAsync()`, `Project.stopExpoServerAsync()`, `Project.ProjectStatus`. [#2684](https://github.com/expo/expo-cli/pull/2684)

### 🎉 New features

- [expo-cli] replace @expo/build-tools with @expo/eas-build-job to reduce dependencies size. [#2679](https://github.com/expo/expo-cli/pull/2679)
- [expo-cli] Upgrade - skip installing the expo package if it is already set to the correct version
- [expo-cli] Upgrade - link to upgrade-helper in bare workflow when relevant

### 🐛 Bug fixes

- [config] improve modules ([#2674](https://github.com/expo/expo-cli/issues/2674))
- [expo-cli] Support unauthorized devices ([#2681](https://github.com/expo/expo-cli/issues/2681))

### 📦 Packages updated

- @expo/config@3.3.4
- @expo/dev-server@0.1.29
- @expo/dev-tools@0.13.46
- @expo/electron-adapter@0.0.20
- expo-cli@3.27.8
- expo-optimize@0.1.51
- @expo/metro-config@0.1.29
- @expo/next-adapter@2.1.34
- expo-pwa@0.0.39
- uri-scheme@1.0.35
- @expo/webpack-config@0.12.33
- @expo/xdl@58.0.7

## [Mon, 21 Sep 2020 19:11:42 -0700](https://github.com/expo/expo-cli/commit/d77fcb4613fa535ca809c833acc016759d93d996)

### 🛠 Breaking changes

### 🎉 New features

- [configure-splash-screen] Simplified and unified arguments, parameters and `--help` output. See `configure-splash-screen --help` to see the changes. [#2297](https://github.com/expo/expo-cli/pull/2297)

### 🐛 Bug fixes

- [xdl] Fix downloadApkAsync so it uses passed in URL rather than always depending on versions endpoint `androidUrl`
- [cli] Bring back support for EXPO_APPLE_ID ([#2671](https://github.com/expo/expo-cli/issues/2671))

### 📦 Packages updated

- @expo/config@3.3.3
- @expo/configure-splash-screen@0.1.19
- @expo/dev-server@0.1.28
- @expo/dev-tools@0.13.45
- @expo/electron-adapter@0.0.19
- expo-cli@3.27.7
- expo-optimize@0.1.50
- @expo/metro-config@0.1.28
- @expo/next-adapter@2.1.33
- expo-pwa@0.0.38
- uri-scheme@1.0.34
- @expo/webpack-config@0.12.32
- @expo/xdl@58.0.6

## [Fri, 18 Sep 2020 12:23:25 -0700](https://github.com/expo/expo-cli/commit/a5eb9cafd0b46120d3fcafa861b4fac164c7d978)

### 🛠 Breaking changes

### 🎉 New features

- [json-file] Add `ensureDir` option [#2664](https://github.com/expo/expo-cli/pull/2664)
- [configure-splash-screen] Refactor and integrate with `@expo/config` ([#2297](https://github.com/expo/expo-cli/issues/2297))

### 🐛 Bug fixes

- [cli] `build:android` fix missing keytool warning if user want to specify ceredentials manually [#2662](https://github.com/expo/expo-cli/pull/2662)
- [cli] Re-use source root lookup from @expo/config to fix updates config on init for projects with names that are altered for native project compat
- [cli] fix prompt helpers ([#2667](https://github.com/expo/expo-cli/issues/2667))
- [xdl] Build iOS shell app artifact in the current directory (instead of one level up). ([#2608](https://github.com/expo/expo-cli/issues/2608))
- [next-adapter] ReferenceError Html is not defined ([#2666](https://github.com/expo/expo-cli/issues/2666))

### 📦 Packages updated

- @expo/config@3.3.2
- @expo/configure-splash-screen@0.1.17
- @expo/dev-server@0.1.27
- @expo/dev-tools@0.13.44
- @expo/electron-adapter@0.0.18
- expo-cli@3.27.6
- expo-optimize@0.1.49
- @expo/json-file@8.2.24
- @expo/metro-config@0.1.27
- @expo/next-adapter@2.1.32
- @expo/package-manager@0.0.33
- pod-install@0.1.12
- expo-pwa@0.0.37
- uri-scheme@1.0.33
- @expo/webpack-config@0.12.31
- @expo/xdl@58.0.5

## [Thu, 17 Sep 2020 13:28:59 -0700](https://github.com/expo/expo-cli/commit/f0c9270058f38cc1b58bd03765e3e1de747c7b39)

### 🛠 Breaking changes

- [cli] Remove deprecated --web-only flag from start command

### 🎉 New features

- [cli] EAS Build: Improve errors and warnings when deprecating API [#2639](https://github.com/expo/expo-cli/pull/2639)
- [cli] support `--config` flag in `expo credentials:manager` [#2641](https://github.com/expo/expo-cli/pull/2641)
- [cli] warn the user when the bundle ID or package name is already in use ([#2616](https://github.com/expo/expo-cli/issues/2616))
- [cli] Make gitignore and native project step idempotent in eject ([#2620](https://github.com/expo/expo-cli/issues/2620))
- [cli] Added no-install and npm args to eject ([#2621](https://github.com/expo/expo-cli/issues/2621))
- [cli] Improve JSON error formatting ([#2635](https://github.com/expo/expo-cli/issues/2635))
- [cli] warn about Constants.manifest and assetBundlePatterns on eject ([#2648](https://github.com/expo/expo-cli/issues/2648))
- [cli] Log about upload after build:ios completes ([#2649](https://github.com/expo/expo-cli/issues/2649))
- [config-types] Generate types for Expo config ([#2622](https://github.com/expo/expo-cli/issues/2622))
- [optimize] Compile expo/config in expo-optimize - faster install time! ([#2643](https://github.com/expo/expo-cli/issues/2643))
- [xdl] Exclude IDFA code from Branch ([#2655](https://github.com/expo/expo-cli/issues/2655))

### 🐛 Bug fixes

- [configure-splash-screen] Fix error when project's name contains only numeric characters [#2657](https://github.com/expo/expo-cli/pull/2657)
- [cli] Fix credential fetching for team members acting on behalf of a project owner [#2660](https://github.com/expo/expo-cli/pull/2660)
- [cli] Fix errors preventing expo eas:build:init from working
- [cli] add missing owner query param ([#2660](https://github.com/expo/expo-cli/issues/2660))
- [next-adapter] Next warning Expected Document Component Html was not rendered ([#2661](https://github.com/expo/expo-cli/issues/2661))
- [config] Disable using the project's babel.config.js for transpiling app.config.js ([#2656](https://github.com/expo/expo-cli/issues/2656))
- [configure-splash-screen] Fix error up upon numeric name ([#2657](https://github.com/expo/expo-cli/issues/2657))
- [xdl] resolve locales from project root ([#2647](https://github.com/expo/expo-cli/issues/2647))
- [cli] Remove external config evaluation script ([#2625](https://github.com/expo/expo-cli/issues/2625))
- [cli] remove extra config reads ([#2636](https://github.com/expo/expo-cli/issues/2636))
- [xdl] Fix path to expo-random
- [xdl] Add expo-random to SDK39+ iOS shell apps ([#2640](https://github.com/expo/expo-cli/issues/2640))
- [cli] Added better logs for invalid custom config paths ([#2626](https://github.com/expo/expo-cli/issues/2626))

### 📦 Packages updated

- @expo/babel-preset-cli@0.2.18
- @expo/config@3.3.1
- @expo/configure-splash-screen@0.1.16
- @expo/dev-server@0.1.26
- @expo/dev-tools@0.13.43
- @expo/electron-adapter@0.0.17
- expo-cli@3.27.5
- expo-codemod@1.0.29
- expo-optimize@0.1.48
- @expo/image-utils@0.3.6
- @expo/json-file@8.2.23
- @expo/metro-config@0.1.26
- @expo/next-adapter@2.1.30
- @expo/osascript@2.0.24
- @expo/package-manager@0.0.32
- @expo/plist@0.0.10
- pod-install@0.1.11
- expo-pwa@0.0.36
- @expo/schemer@1.3.21
- uri-scheme@1.0.32
- @expo/webpack-config@0.12.30
- @expo/xdl@58.0.4

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
