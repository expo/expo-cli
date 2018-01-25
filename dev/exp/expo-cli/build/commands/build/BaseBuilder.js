'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends2;

function _load_extends() {
  return _extends2 = _interopRequireDefault(require('babel-runtime/helpers/extends'));
}

var _regenerator;

function _load_regenerator() {
  return _regenerator = _interopRequireDefault(require('babel-runtime/regenerator'));
}

var _asyncToGenerator2;

function _load_asyncToGenerator() {
  return _asyncToGenerator2 = _interopRequireDefault(require('babel-runtime/helpers/asyncToGenerator'));
}

var _classCallCheck2;

function _load_classCallCheck() {
  return _classCallCheck2 = _interopRequireDefault(require('babel-runtime/helpers/classCallCheck'));
}

var _createClass2;

function _load_createClass() {
  return _createClass2 = _interopRequireDefault(require('babel-runtime/helpers/createClass'));
}

var _xdl;

function _load_xdl() {
  return _xdl = require('xdl');
}

var _inquirer;

function _load_inquirer() {
  return _inquirer = _interopRequireDefault(require('inquirer'));
}

var _log;

function _load_log() {
  return _log = _interopRequireDefault(require('../../log'));
}

var _chalk;

function _load_chalk() {
  return _chalk = _interopRequireDefault(require('chalk'));
}

var _publish;

function _load_publish() {
  return _publish = require('../publish');
}

var _BuildError;

function _load_BuildError() {
  return _BuildError = _interopRequireDefault(require('./BuildError'));
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var BaseBuilder = function () {
  function BaseBuilder(projectDir, options) {
    (0, (_classCallCheck2 || _load_classCallCheck()).default)(this, BaseBuilder);
    this.projectDir = '';
    this.options = {
      wait: false,
      clearCredentials: false,
      releaseChannel: 'default',
      publish: false
    };

    this.projectDir = projectDir;
    this.options = options;
  }

  (0, (_createClass2 || _load_createClass()).default)(BaseBuilder, [{
    key: 'command',
    value: function () {
      var _ref = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee() {
        return (_regenerator || _load_regenerator()).default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.prev = 0;
                _context.next = 3;
                return this._checkProjectConfig();

              case 3:
                _context.next = 5;
                return this.run();

              case 5:
                _context.next = 15;
                break;

              case 7:
                _context.prev = 7;
                _context.t0 = _context['catch'](0);

                if (_context.t0 instanceof (_BuildError || _load_BuildError()).default) {
                  _context.next = 13;
                  break;
                }

                throw _context.t0;

              case 13:
                (_log || _load_log()).default.error(_context.t0.message);
                process.exit(1);

              case 15:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this, [[0, 7]]);
      }));

      function command() {
        return _ref.apply(this, arguments);
      }

      return command;
    }()
  }, {
    key: '_checkProjectConfig',
    value: function () {
      var _ref2 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee2() {
        var _ref3, exp;

        return (_regenerator || _load_regenerator()).default.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return (_xdl || _load_xdl()).ProjectUtils.readConfigJsonAsync(this.projectDir);

              case 2:
                _ref3 = _context2.sent;
                exp = _ref3.exp;

                if (exp.isDetached) {
                  (_log || _load_log()).default.error('`exp build` is not supported for detached projects.');
                  process.exit(1);
                }

              case 5:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function _checkProjectConfig() {
        return _ref2.apply(this, arguments);
      }

      return _checkProjectConfig;
    }()
  }, {
    key: 'checkStatus',
    value: function () {
      var _ref4 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee3() {
        var current = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
        var buildStatus;
        return (_regenerator || _load_regenerator()).default.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.next = 2;
                return this._checkProjectConfig();

              case 2:

                (0, (_log || _load_log()).default)('Checking if current build exists...\n');

                _context3.next = 5;
                return (_xdl || _load_xdl()).Project.buildAsync(this.projectDir, {
                  mode: 'status',
                  current: current
                });

              case 5:
                buildStatus = _context3.sent;

                if (!buildStatus.err) {
                  _context3.next = 8;
                  break;
                }

                throw new Error('Error getting current build status for this project.');

              case 8:
                if (!(buildStatus.jobs && buildStatus.jobs.length)) {
                  _context3.next = 15;
                  break;
                }

                (_log || _load_log()).default.raw();
                (0, (_log || _load_log()).default)('============');
                (0, (_log || _load_log()).default)('Build Status');
                (0, (_log || _load_log()).default)('============\n');
                buildStatus.jobs.forEach(function (j) {
                  var platform = void 0;
                  if (j.platform === 'ios') {
                    platform = 'iOS';
                  } else {
                    platform = 'Android';
                  }

                  var status = void 0;
                  switch (j.status) {
                    case 'pending':
                      status = 'Build waiting in queue...';
                      break;
                    case 'started':
                      status = 'Build started...';
                      break;
                    case 'in-progress':
                      status = 'Build in progress...';
                      break;
                    case 'finished':
                      status = 'Build finished.';
                      break;
                    case 'errored':
                      status = 'There was an error with this build.';
                      if (buildStatus.id) {
                        status += '\n\nWhen requesting support, please provide this build ID:\n\n' + buildStatus.id + '\n';
                      }
                      break;
                    default:
                      status = '';
                      break;
                  }

                  if (j.status !== 'finished') {
                    (0, (_log || _load_log()).default)(platform + ': ' + status);
                  } else {
                    (0, (_log || _load_log()).default)(platform + ':');
                    switch (j.platform) {
                      case 'ios':
                        if (!j.artifacts) {
                          (0, (_log || _load_log()).default)('Problem getting IPA URL. Please try build again.');
                          break;
                        }
                        (0, (_log || _load_log()).default)('IPA: ' + j.artifacts.url + '\n');
                        break;
                      case 'android':
                        if (!j.artifacts) {
                          (0, (_log || _load_log()).default)('Problem getting APK URL. Please try build again.');
                          break;
                        }
                        (0, (_log || _load_log()).default)('APK: ' + j.artifacts.url + '\n');
                        break;
                    }
                  }
                });

                throw new (_BuildError || _load_BuildError()).default('Cannot start new build, as there is a build in progress.');

              case 15:

                (0, (_log || _load_log()).default)('No currently active or previous builds for this project.');

              case 16:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function checkStatus() {
        return _ref4.apply(this, arguments);
      }

      return checkStatus;
    }()
  }, {
    key: '_shouldPublish',
    value: function () {
      var _ref5 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee4() {
        var _ref6, shouldPublish;

        return (_regenerator || _load_regenerator()).default.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                if (!this.options.publish) {
                  _context4.next = 2;
                  break;
                }

                return _context4.abrupt('return', true);

              case 2:
                _context4.next = 4;
                return (_inquirer || _load_inquirer()).default.prompt([{
                  name: 'shouldPublish',
                  type: 'confirm',
                  message: 'No existing releases found. Would you like to publish your app now?'
                }]);

              case 4:
                _ref6 = _context4.sent;
                shouldPublish = _ref6.shouldPublish;
                return _context4.abrupt('return', shouldPublish);

              case 7:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function _shouldPublish() {
        return _ref5.apply(this, arguments);
      }

      return _shouldPublish;
    }()
  }, {
    key: 'ensureReleaseExists',
    value: function () {
      var _ref7 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee5(platform) {
        var release, _ref8, ids, url, err;

        return (_regenerator || _load_regenerator()).default.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                if (this.options.publish) {
                  _context5.next = 8;
                  break;
                }

                (0, (_log || _load_log()).default)('Looking for releases...');
                _context5.next = 4;
                return (_xdl || _load_xdl()).Project.getLatestReleaseAsync(this.projectDir, {
                  releaseChannel: this.options.releaseChannel,
                  platform: platform
                });

              case 4:
                release = _context5.sent;

                if (!release) {
                  _context5.next = 8;
                  break;
                }

                (0, (_log || _load_log()).default)('Using existing release on channel "' + release.channel + '":\n  publicationId: ' + release.publicationId + '\n  publishedTime: ' + release.publishedTime);
                return _context5.abrupt('return', [release.publicationId]);

              case 8:
                _context5.next = 10;
                return this._shouldPublish();

              case 10:
                if (!_context5.sent) {
                  _context5.next = 26;
                  break;
                }

                _context5.next = 13;
                return (0, (_publish || _load_publish()).action)(this.projectDir, {
                  releaseChannel: this.options.releaseChannel,
                  platform: platform
                });

              case 13:
                _ref8 = _context5.sent;
                ids = _ref8.ids;
                url = _ref8.url;
                err = _ref8.err;

                if (!err) {
                  _context5.next = 21;
                  break;
                }

                throw new (_BuildError || _load_BuildError()).default('No url was returned from publish. Please try again.\n' + err);

              case 21:
                if (!(!url || url === '')) {
                  _context5.next = 23;
                  break;
                }

                throw new (_BuildError || _load_BuildError()).default('No url was returned from publish. Please try again.');

              case 23:
                return _context5.abrupt('return', ids);

              case 26:
                throw new (_BuildError || _load_BuildError()).default('No releases found. Please create one using `exp publish` first.');

              case 27:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function ensureReleaseExists(_x2) {
        return _ref7.apply(this, arguments);
      }

      return ensureReleaseExists;
    }()
  }, {
    key: 'build',
    value: function () {
      var _ref9 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee6(expIds, platform) {
        var opts, buildResp, ipaUrl, apkUrl, buildErr;
        return (_regenerator || _load_regenerator()).default.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                (0, (_log || _load_log()).default)('Building...');

                opts = {
                  mode: 'create',
                  expIds: expIds,
                  platform: platform,
                  releaseChannel: this.options.releaseChannel
                };


                if (platform === 'ios') {
                  opts = (0, (_extends2 || _load_extends()).default)({}, opts, {
                    type: this.options.type
                  });
                }

                // call out to build api here with url
                _context6.next = 5;
                return (_xdl || _load_xdl()).Project.buildAsync(this.projectDir, opts);

              case 5:
                buildResp = _context6.sent;

                if (!this.options.wait) {
                  _context6.next = 19;
                  break;
                }

                ipaUrl = buildResp.ipaUrl, apkUrl = buildResp.apkUrl, buildErr = buildResp.buildErr;
                // do some stuff here
                // FIXME(perry) this is duplicate code to the checkStatus function

                if (!buildErr) {
                  _context6.next = 12;
                  break;
                }

                throw new (_BuildError || _load_BuildError()).default('Build failed with error.\n' + buildErr);

              case 12:
                if (!(!ipaUrl || ipaUrl === '' || !apkUrl || apkUrl === '')) {
                  _context6.next = 14;
                  break;
                }

                throw new (_BuildError || _load_BuildError()).default('No url was returned from the build process. Please try again.');

              case 14:

                (0, (_log || _load_log()).default)('IPA Url: ' + ipaUrl);
                (0, (_log || _load_log()).default)('APK Url: ' + apkUrl);

                (0, (_log || _load_log()).default)('Successfully built standalone app!');
                _context6.next = 22;
                break;

              case 19:
                (0, (_log || _load_log()).default)('Build started, it may take a few minutes to complete.');

                if (buildResp.id) {
                  (0, (_log || _load_log()).default)('You can monitor the build at\n\n ' + (_chalk || _load_chalk()).default.underline(constructBuildLogsUrl(buildResp.id)) + '\n');
                }

                (0, (_log || _load_log()).default)('Alternatively, run `exp build:status` to monitor it from the command line.');

              case 22:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function build(_x3, _x4) {
        return _ref9.apply(this, arguments);
      }

      return build;
    }()
  }]);
  return BaseBuilder;
}();

exports.default = BaseBuilder;


function constructBuildLogsUrl(buildId) {
  if (process.env.EXPO_STAGING) {
    return 'https://staging.expo.io/builds/' + buildId;
  } else if (process.env.EXPO_LOCAL) {
    return 'http://expo.dev/builds/' + buildId;
  } else {
    return 'https://expo.io/builds/' + buildId;
  }
}
module.exports = exports['default'];
//# sourceMappingURL=../../__sourcemaps__/commands/build/BaseBuilder.js.map
