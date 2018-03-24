# Changelog

For guidelines on how to update this file, visit http://keepachangelog.com/en/0.3.0/.

## Unreleased

### Added

### Changed

### Removed

## [48.0.7] - 2018-03-24

* Fix a regression in `Detach`.

## [48.0.6] - 2018-03-16

* Fix a regression with starting tunnels on Windows.

## [48.0.5] - 2018-03-15

### Added

* `Project.startAsync` now allows `maxWorkers` option to be passed to Metro.
* Added `developerTool` to XDL Serve Manifest event.
* Detach command now prompts for iOS `bundleIdentifier` and Android `package` unless found in `app.json`.

### Changed

* Moved authentication to use the sessions API.
* Upgraded authentication libraries.
* Upgraded ngrok binaries.
* Fixed unnecessary requests being made to `localhost:80` before starting the server.
* XDL now trims the hostname read from `EXPO_PACKAGER_HOSTNAME` environment variables to fix issues on Windows.

## [48.0.4] - 2018-02-02

### Changed

* Increase `maxBodyLength` for HTTP requests.

## [48.0.3] - 2018-02-01

### Changed

* Improve logging of publishing errors.

## [48.0.2] - 2018-01-25

### Changed

* Fix project validation crashing when `npm ls` doesn't return a package version.
* Fix unnecessary warning "Problem checking node_modules dependencies" being shown when server is stopped using Ctrl+C.
* Fix iOS detach attempting to download assets when none are specified.

## [48.0.1] - 2018-01-19

### Changed

* Fix _inquirer ... is not a function error

## [48.0.0] - 2018-01-18

### Changed

* Detach upgrades for SDK 25.

## [47.2.0] - 2018-01-17

### Added

* Support for HTTP(S) reverse proxies using `EXPO_PACKAGER_PROXY_URL` and `EXPO_MANIFEST_PROXY_URL` environment variables.

### Changed

* Fix `DocumentPicker` entitlements in detached iOS apps.
* Other iOS detach improvements.

## [47.1.2] - 2017-12-18

### Changed

* Fixed detach bug

## [47.1.1] - 2017-12-13

### Added

* Add support for SDK 24

### Changed

* Fix duplicate assets in manifest "bundledAssets"
* Fix adb reverse not running for all ports

## [47.1.0] - 2017-12-07

### Added

* Add support for custom `*UsageDescription` strings in iOS standalone builds

### Changed

* Fix failed downloads being stored in template cache
* Remove invalid peer dependency warnings

### Removed

* Deprecate `urlType` and `strict` project settings

## [47.0.4] - 2017-11-23

### Changed

* Increase template download timeout
* Improve error handling

## [47.0.0] - 2017-11-16

### Added

* Support for release channels

### Changed

* HTTP requests use Chromium network stack in Electron
* Detach and Turtle improvements
* Replaced deprecated tar.gz package

## [46.1.0] - 2017-10-27

### Changed

* Only detach iOS on macOS or when a --force flag is added

## [46.0.1] - 2017-10-18

### Added

* Fix weird warnings during detach.

## [46.0.0] - 2017-10-18

### Added

* No npm warnings if yarn exists

### Changed

* Error message improvements
* Fix schema validation issues

### Removed

* Remove dependency on macOS to detach
* Remove sentry event logging temporarily

## [45.0.0] - 2017-09-27

### Added

* Powertools updates

### Changed

* Improve sending link via SMS, better message, make sure user is logged in

## [44.0.2] - 2017-08-24

### Changed

* @expo/schemer updated to fix issue running in XDE
* fixes XDE 20 errors and code being skipped in local testing because of env var

## [44.0.0] - 2017-08-18

### Added

* Add missing push notification permission
* New schema validation library
* Allow boolean packagerOpts
* Sentry integration for error reporting
* Test ngrok tunnels and use fallback

### Changed

* iOS Pod tools generate Podfile with c++ bridge and 3rd party dependencies
* exp install handles errors better
* Better authentication errors

## [43.0.1] - 2017-07-25

### Added

* Re-enable intercom

## [43.0.0] - 2017-07-21

### Changed

* Catch errors in state.json parsing
* Detach updates for SDK 19
* Don't validate React Native version when not using our fork

## [42.4.0] - 2017-07-10

### Changed

* Make ngrok a dev dependency of xdl, needs to be provided by xdl consumers that expect to create tunnels. (Yay for drastically smaller CRNA installs!)
* Remove react peer dependency and associated warnings -- xdl consumers should provide react.
* Setting offline mode will no longer automatically log a user out.
* Validate npm against a version range, not just any 5.x.x release.
* Use a fork of bunyan without DTraceProviderBindings issues.
* Remove deprecation warnings about @exponent/* packages.

### Added

* Display standalone build IDs in error messages so users can get help much faster on failed builds.

## [42.3.0] - 2017-07-07

### Changed

* Convert wrong npm version to warning, was error.
* Log debug log messages to file, skip terminal.

## [42.2.0]

### Changed

* Suppress some spurious @providesModule warnings that come from RN itself.

## [42.1.0] - 2017-06-23

### Changed

* Fixed a couple of issues with checking npm version.
* Backed out Axios network requests.

## [42.0.0] - 2017-06-22

### Changed

* Move network requests to Axios.
* Warn if using an unsupported npm version.
* Provide cached schema for validating SDK 18 projects.

## [41.0.0] - 2017-05-12

### Added

* Post-publish hooks.
* Better log reporting
* Fix Android HMR bug by adding `:80` to url.

## [39.0.0] - 2017-04-06

### Added

* Better log reporting
* Fix Android HMR bug by adding `:80` to url.

## [37.0.2] - 2017-04-02

### Added

* When serving manifest over LAN, if request hostname is localhost then
manifest urls also use localhost. This makes it easier to open a project
in simulator when on locked-down wifi.

## [37.0.1] - 2017-03-21

### Changed

* Fixed download bug.

## [37.0.0] - 2017-03-20

### Added

* Support `EXPO_PACKAGER_HOSTNAME` and `REACT_NATIVE_PACKAGER_HOSTNAME` env variables.
* All `EXPO_*` and `REACT_NATIVE_*` env variables are sent in the manifest.

### Changed

* New project download progress bar fixes.

## [36.1.0] - 2017-03-17

### Changed

* Fixed `Android.upgradeExpoAsync`.
* Change docs url from docs.getexponent.com to docs.expo.io.

## [36.0.0] - 2017-03-16

### Added

* Converting RN projects to SDK 15 is now supported.
* Improved template downloads.

### Changed

* Eliminated a large class of Flow errors for xdl consumers.
* xdl's ngrok dependency now bundles the binaries with the package. This is a tradeoff -- the download is larger, but there's no need to rely on an external CDN which may or may not respect npm/yarn's network configuration.

### Removed

* Removed the `diskusage` and `runas` optional dependencies. They were causing problems for users without native build tools who were also using certain versions of yarn.

## [35.0.0] - 2017-03-15

### Changed

* Detach changes for SDK 15.

## [34.0.0] - 2017-03-07

### Changed

* Fixed detach for SDK 14.

## [33.0.0] - 2017-03-06

### Changed

* References to Exponent have been renamed to Expo.

## [32.0.0] - 2017-02-28

### Added

* New iOS simulator warnings.

### Changed

* `Android.openProjectAsync` now returns an object with `success` (boolean) and `error` (nullable object) keys to indicate the result of the action.
* Fixed a bug in persisting project settings.

### Removed

* Removed export of `Android.openUrlAsync` that is not used by any current consumers.

## [31.1.0] - 2017-02-24

### Changed

* Fix detach on windows.
* Add Xcode warning if osascript command fails.
* Show full error if publish gets a 500 response from packager.

## [31.0.0] - 2017-02-22

### Changed

* Updates to iOS detach script.

## [30.0.1] - 2017-02-20

### Changed

* Make offline mode only use local IP temporarily.
* Minor watchman stability improvements.

## [30.0.0] - 2017-02-14

### Added

* Add redux store for notifications.
* Add suggestion to point command line tools to Xcode.

### Changed

* Another fix for getting logged out.
* Make Project.stopAsync more reliable.

## [29.5.0] - 2017-01-27

### Changed

* Compile bundled watchman without pcre.
* Better Xcode error handling.

## [29.4.0] - 2017-01-25

### Added

* Support for running the RN packager with the `Config.offline` flag, bypassing an Expo account.
* Workarounds for state corruption problems in watchman.

### Changed

* Improved error messages for a variety of issues.

## [29.3.0] - 2017-01-23

### Changed

* Resolved several issues that resulted in premature logout of Expo account sessions.

## [29.2.0] - 2017-1-18

### Changed

* Ensure that the user is logged in on every api call.
* Fix detach script to remove all comments from .gradle file.

## [29.0.0] - 2017-1-17

### Changed

* Fix accounts bugs.
* First release of detach.

## [28.0.0] - 2017-1-11

### Changed

* Better accounts system!

## [0.26.6] - 2016-12-07

Start of change log.
