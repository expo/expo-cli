# Changelog

For guidelines on how to update this file, visit http://keepachangelog.com/en/0.3.0/.

## Unreleased

### Added

### Changed

### Removed

## [55.0.5] - 2018-07-12

### Added

* Ability to run Android and iOS builds concurrently.

## [55.0.4] - 2018-06-20

### Changed

* Upgrade XDL to 50.4.2.

## [55.0.3] - 2018-06-19

### Added

* Add support for new build job status (`sent-to-queue`).

## [55.0.2] - 2018-06-15

### Changed

* Fix providing credentials in an expert mode.

## [55.0.1] - 2018-06-12

### Changed

* Fix generating provisioning profile in `exp build:ios`.

## [55.0.0] - 2018-06-11

### Added

* Add support for backing up Android credentials.

### Changed

* Upgrade to XDL 50.2.0.
* Use released gulp 4.0.

### Removed

* Remove `[exp]` prefix from logs.

## [54.0.1] - 2018-05-28

### Changed

* Show a better error message for Apple ID privacy statement errors in `exp build:ios`.

## [54.0.0] - 2018-05-14

### Added

* Add `exp fetch:android:hashes` for fetching the Android key hashes needed to setup Google/Facebook authentication.

### Changed

* Warn about builds for invalid SDK version
* Update xdl to version 50.0.0.

## [53.1.0] - 2018-04-27

### Changed

* Make `exp build:status` print 10 last builds.
* Upgrade to XDL v49.2.0.

## [53.0.0] - 2018-04-18

### Added

* Added `exp bundle-assets` command used by the build scripts in detached apps.
* Added CLI options for specifying credentials, so that build scripts can pass them to avoid triggering a prompt to enter these settings.
  * New options for `exp build:ios`:
  ```
  --team-id <apple-teamId>                        Apple Team ID.
  --dist-p12-path <dist.p12>                      Path to your Distribution Certificate P12.
  --push-p12-path <push.p12>                      Path to your push notification certificate P12 file.
  --provisioning-profile-path <.mobileprovision>  Path to your provisioning Profile.
  ```
  * New environment variables for `exp build:ios`:
  ```
  EXPO_IOS_DIST_P12_PASSWORD
  EXPO_IOS_PUSH_P12_PASSWORD
  ```
  * New options for `exp build:android`:
  ```
  --keystore-path <app.jks>   Path to your keystore.
  --keystore-alias <alias>    Keystore alias
  ```
  * New environment variables for `exp build:android`:
  ```
  EXPO_ANDROID_KEYSTORE_PASSWORD
  EXPO_ANDROID_KEY_PASSWORD
  ```

### Removed

## [52.0.3] - 2018-04-13

### Changed

* Fix handling of unrecognized Metro events.

## [52.0.0] - 2018-04-12

### Added

* Errors from building JavaScript bundles are now shown in the console with syntax highlighted code snippets.

### Changed

* Improve the error message for syntax errors in `app.json` or `package.json`.
* Rename `--projectType` option of `exp init` to `--template`.
* Make `exp init` faster: download templates from a CDN.
* Improve validation of the project path in `exp init`.
* Remove the need to be logged in to use `exp init`.
* Display descriptions of templates in `exp init`.
* Fix resolving the project directory: `exp init .` now creates a project in the current working directory.

### Removed

## [51.4.0] - 2018-03-31

* Remove unnecessary validations.
* Update `@expo/json-file` dependency.

## [51.2.0] - 2018-03-30

### Added

* Added `push:android` commands and support for `android.googleServicesFile` app.json config.

## [50.0.1] - 2018-03-16

### Changed

* Fixed a regression with starting tunnels on Windows.
* Fixed `exp login` failing in non-interactive mode.

## [50.0.0] - 2018-03-15

### Added

* [#102](https://github.com/expo/exp/pull/102) Add ability to block/wait until standalone build succeeds or fails ([@mglagola](https://github.com/mglagola))

  `exp build:android` and `exp build:ios` now automatically wait until the build has finished – no need to manually poll for the status. To disable waiting, run with `--no-wait`.

* [#103](https://github.com/expo/exp/pull/103) Add `exp url:apk` and `exp url:ipa` commands for looking up Android and iOS binary URLs after building a standalone app. ([@mglagola](https://github.com/mglagola))

* Add `--max-workers [num]` option to `exp publish`.

  You can use this to limit the number of workers Metro uses when building the app, e.g. if you're running `exp publish` on a CI server that has a smaller number of CPUs available than reported by the operating system.

* [#96](https://github.com/expo/exp/pull/96) Add release channel to the output of `exp publish` ([@dozoisch](https://github.com/dozoisch))
* [#100](https://github.com/expo/exp/pull/100) Add timestamps to log output. ([@wKovacs64](https://github.com/wKovacs64))

### Changed

* `--non-interactive` option is now automatically enabled for all commands, if stdout is not a terminal. (E.g. on a continuous integration server.)
* `exp url` now aborts, if the `exp` server is not running, instead of returning an incorrect URL.
* `exp detach` command now prompts for iOS `bundleIdentifier` and Android `package` unless found in `app.json`.
* Fix `exp build:ios` failing when installation path has a space in it.

### Removed

* [#97](https://github.com/expo/exp/pull/97) Remove alias `-c` for `--release-channel` from `exp build` commands, because it conflicted with the alias for `--clear`. ([@dozoisch](https://github.com/dozoisch))
* `exp login --github` is temporarily disabled, while we migrate to the new authentication system. Please use username and password to login for now.

## [49.2.0] - 2018-02-04

* Expose `--revoke-apple-certs` and `--revoke-apple-provisioning-profile` for `build:ios`

## [49.1.0] - 2018-02-02

* Use bumped traveling-fastlane, let user make enterprise based Apple accounts cert files

## [49.0.8] - 2018-02-02

* Update `xdl` to v48.0.4.

## [49.0.6] - 2018-02-01

### Changed

* Update `xdl` to v48.0.3.

## [49.0.1] - 2018-01-25

### Added

* Add environment info to `exp diagnostics` command. (https://github.com/expo/exp/pull/98)
* Add `--no-publish` flag to `exp build:*` commands.

### Changed

* Update `xdl` to v48.0.2.

## Removed

* Remove `--publish` flag from `exp build:*` commands. Build commands now always publish by default. Publishing before building can be disabled with the `--no-publish` flag.

## [48.0.2] - 2018-01-19

### Changed

* Update `xdl` to v48.0.1.

## [48.0.0] - 2018-01-18

### Changed

* Update `xdl` to v48.0.0.

## [47.1.2] - 2017-12-18

### Changed

* Update `xdl` to v47.1.2.

## [47.1.1] - 2017-12-13

### Changed

* Update `xdl` to v47.1.1.

## [47.1.0] - 2017-12-12

### Added

* Add `--clear` flag to `publish` command that clears the packager cache
* Add "expert auth" mode to allow standalone builds without any Apple login

## [47.0.0] - 2017-12-07

### Changed

* Update `xdl` to v47.1.0.
* Fix issue with `exp build:android` and `exp build:ios` commands not being able to locate p12/keystore files.

### Removed

* Remove `--protocol`, `--exp`, `--http` and `--redirect` flags from `exp start|send|url`. These commands display `exp` protocol URLs by default.
* Remove `--strict` and `--no-strict` flags.

## [46.0.1] - 2017-11-16

### Added

* Release channels
* `publish:history` and `publish:details` commands

### Changed

* Tunnel status: show a message if the tunnel goes down

## [45.1.0] - 2017-10-27

### Changed

* Only detach iOS on macOS or when a --force flag is added

## [45.0.2] - 2017-10-18

### Changed

* Update xdl to 46.0.1

## [45.0.0] - 2017-10-18

### Changed

* new version of XDL with new @expo/schemer
* collapse stack traces

## [44.0.0] - 2017-08-17

### Added

* exp install:ios and exp install:android

### Changed

* Build using pkg

### Removed

* Remove redundant doctor checks

## [43.0.0] - 2017-07-21

### Changed

* Update `xdl` to v43.0.0.

## [42.2.0] - 2017-07-10

### Changed

* Provide ngrok in exp install, since xdl no longer provides it.
* `exp login` prompts to confirm you want to log out if you already have a session.
* No longer display QR code if running a detached app, to encourage using the built-in URL that comes from building the ExpoKit app from source.
* `exp login` and `exp whoami` are easier to read.
* Only display error stacktraces if `EXPO_DEBUG` environment variable is set.
* Support non-interactive logins properly.
* Cleaned up `exp init` UI.
* `exp init` prompts for a project name if it's not provided on the command line.
* Move to a fork of bunyan to prevent DTraceProviderBindings errors never show up.
* Removed deprecated package warnings.
* Display standalone build IDs if they fail, should make support requests much easier.
* Support clearing standalone Android keystores again. This will prompt you to make sure your keystore is backed up.

## [42.0.0] - 2017-06-22

### Changed

* Update `xdl` to v42.0.0.
* Remove lag at end of commands.
* Add command for downloading iOS/Android shell app credentials.

## [39.0.0] - 2017-04-06

### Changed

* Update `xdl` to v39.0.0.

## [37.0.0] - 2017-03-21

### Changed

* Update `xdl` to v37.0.1.

## [37.0.0] - 2017-03-17

### Changed

* Update `xdl` to v37.0.0.

## [36.0.0] - 2017-03-15

### Changed

* Update `xdl` to v35.0.0.

## [35.2.0] - 2017-03-07

### Changed

* Update `xdl` to v34.0.0.

## [35.1.0] - 2017-03-07

### Removed

* Removed `-c` option from `exp build:android`. Contact us if you need to remove your credentials and we can handle it manually for now.

## [35.0.0] - 2017-03-06

### Added

* Commands which may require a login session have a `--non-interactive` flag that can be used to disable the use of interactive prompts.

### Changed

* References to Exponent have been renamed to Expo.
* If not logged in for a command that requires authentication, an interactive login/registration prompt will be presented to the user.

## [34.2.0] - 2017-02-24

### Added

* Update `xdl` to v31.1.0.

## [34.1.0] - 2017-02-22

### Added

* Add `--offline` option to `start`, `android`, `ios`, and `url`.

## [34.0.0] - 2017-02-22

### Changed

* Update `xdl` to v31.0.0.

## [33.0.3] - 2017-02-16

### Changed

* Added `--quiet` option to `exp publish`.
* Removed `exp publish --verbose` option in favor of `exp publish` defaulting to verbose output.

## [33.0.2] - 2017-02-15

### Changed

* Fixed a typo in progress indicator crash fix

## [33.0.1] - 2017-02-15

### Changed

* Fixed progress indicator crash

## [33.0.0] - 2017-02-14

### Changed

* Update `xdl` to v30.0.0.
* `start` runs in the foreground.
* `publish` starts running the project if necessary.

### Removed

* Removed `logs`, `status`, `stop`.
* Removed pm2 dependency.

## [32.3.0] - 2017-01-27

### Changed

* Update `xdl` to v29.5.0.

## [32.1.0] - 2017-01-18

### Changed

* Update `xdl` to v29.2.0.

## [32.0.0] - 2017-01-17

### Changed

* Update `xdl` to v29.0.0.

## [31.0.0] - 2017-01-11

### Changed

* Update `xdl` to v28.0.0.

## [0.30.0] - 2016-12-22

### Changed

* Update `xdl` to v0.27.1.
* Update PATH for XDE on every command.

## [0.29.0] - 2016-12-07

### Changed

* Update `xdl` to v0.26.6.
* List source-map-support as a regular dependency instead of devDependency.
