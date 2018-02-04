# Changelog

For guidelines on how to update this file, visit http://keepachangelog.com/en/0.3.0/.

## Unreleased

### Added

### Changed

### Removed

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
