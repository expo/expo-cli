# Changelog

For guidelines on how to update this file, visit http://keepachangelog.com/en/0.3.0/.

## Unreleased

### Added

### Changed

### Removed

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
