# Changelog

For guidelines on how to update this file, visit http://keepachangelog.com/en/0.3.0/.

## Unreleased

### Added

### Changed

### Removed

## [42.4.0] - 2017-07-10
* Make ngrok a dev dependency of xdl, needs to be provided by xdl consumers that expect to create tunnels. (Yay for drastically smaller CRNA installs!)
* Remove react peer dependency and associated warnings -- xdl consumers should provide react.
* Setting offline mode will no longer automatically log a user out.
* Validate npm against a version range, not just any 5.x.x release.
* Use a fork of bunyan without DTraceProviderBindings issues.
* Remove deprecation warnings about @exponent/* packages.
* Display standalone build IDs in error messages so users can get help much faster on failed builds.

## [42.3.0] - 2017-07-07
* Convert wrong npm version to warning, was error.
* Log debug log messages to file, skip terminal.

## [42.2.0]
* Suppress some spurious @providesModule warnings that come from RN itself.

## [42.1.0] - 2017-06-23
* Fixed a couple of issues with checking npm version.
* Backed out Axios network requests.

## [42.0.0] - 2017-06-22
* Move network requests to Axios.
* Warn if using an unsupported npm version.
* Provide cached schema for validating SDK 18 projects.

## [41.0.0] - 2017-05-12
* Post-publish hooks.

### Added
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
