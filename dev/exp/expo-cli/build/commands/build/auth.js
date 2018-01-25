'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.prepareLocalAuth = exports.validateCredentialsProduceTeamId = exports.doFastlaneActionsExist = exports.doesFileProvidedExist = exports.DEBUG = exports.MULTIPLE_PROFILES = exports.NO_BUNDLE_ID = undefined;

var _slicedToArray2;

function _load_slicedToArray() {
  return _slicedToArray2 = _interopRequireDefault(require('babel-runtime/helpers/slicedToArray'));
}

var _stringify;

function _load_stringify() {
  return _stringify = _interopRequireDefault(require('babel-runtime/core-js/json/stringify'));
}

var _keys;

function _load_keys() {
  return _keys = _interopRequireDefault(require('babel-runtime/core-js/object/keys'));
}

var _promise;

function _load_promise() {
  return _promise = _interopRequireDefault(require('babel-runtime/core-js/promise'));
}

var _regenerator;

function _load_regenerator() {
  return _regenerator = _interopRequireDefault(require('babel-runtime/regenerator'));
}

var _asyncToGenerator2;

function _load_asyncToGenerator() {
  return _asyncToGenerator2 = _interopRequireDefault(require('babel-runtime/helpers/asyncToGenerator'));
}

var validateCredentialsProduceTeamId = exports.validateCredentialsProduceTeamId = function () {
  var _ref6 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee4(creds) {
    var getTeamsAttempt, reason, rawDump, teams, teamChoices, answers;
    return (_regenerator || _load_regenerator()).default.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return spawnAndCollectJSONOutputAsync(FASTLANE.validate_apple_credentials, [creds.appleId, creds.password]);

          case 2:
            getTeamsAttempt = _context4.sent;

            if (DEBUG) {
              console.log({ action: 'teams attempt retrieval', dump: getTeamsAttempt });
            }

            if (!(getTeamsAttempt.result === 'failure')) {
              _context4.next = 7;
              break;
            }

            reason = getTeamsAttempt.reason, rawDump = getTeamsAttempt.rawDump;
            throw new Error('Reason:' + reason + ', raw:' + (0, (_stringify || _load_stringify()).default)(rawDump));

          case 7:
            teams = getTeamsAttempt.teams;

            if (!(teams.length === 0)) {
              _context4.next = 10;
              break;
            }

            throw new Error(NO_TEAM_ID);

          case 10:
            (0, (_log || _load_log()).default)('You have ' + teams.length + ' teams');

            if (!(teams.length === 1)) {
              _context4.next = 16;
              break;
            }

            console.log('Only 1 team associated with your account, using Team ID: ' + teams[0].teamId);
            return _context4.abrupt('return', { teamId: teams[0].teamId });

          case 16:
            teamChoices = teams.map(function (team, i) {
              return i + 1 + ') ' + team['teamId'] + ' "' + team['name'] + '" (' + team['type'] + ')';
            });

            teamChoices.forEach(function (choice) {
              return console.log(choice);
            });
            _context4.next = 20;
            return (_inquirer || _load_inquirer()).default.prompt({
              type: 'list',
              name: 'choice',
              message: 'Which Team ID to use?',
              choices: teamChoices
            });

          case 20:
            answers = _context4.sent;
            return _context4.abrupt('return', { teamId: teams[teamChoices.indexOf(answers.choice)].teamId });

          case 22:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function validateCredentialsProduceTeamId(_x4) {
    return _ref6.apply(this, arguments);
  };
}();

var prepareLocalAuth = exports.prepareLocalAuth = function () {
  var _ref7 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee5() {
    var _release$match, _release$match2, version, _userInfo, username;

    return (_regenerator || _load_regenerator()).default.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            if (!(process.platform === 'win32')) {
              _context5.next = 15;
              break;
            }

            _release$match = (0, _os.release)().match(/\d./), _release$match2 = (0, (_slicedToArray2 || _load_slicedToArray()).default)(_release$match, 1), version = _release$match2[0];

            if (!(version !== '10')) {
              _context5.next = 4;
              break;
            }

            throw new Error('Must be on at least Windows version 10 for WSL support to work');

          case 4:
            _userInfo = (0, _os.userInfo)(), username = _userInfo.username;

            if (username && username.split(' ').length !== 1) {
              (_log || _load_log()).default.warn('Your username should not have empty space in it, exp might fail');
            }
            // Does bash.exe exist?
            _context5.prev = 6;
            _context5.next = 9;
            return (_fsExtra || _load_fsExtra()).default.access(WSL_BASH, (_fsExtra || _load_fsExtra()).default.constants.F_OK);

          case 9:
            _context5.next = 15;
            break;

          case 11:
            _context5.prev = 11;
            _context5.t0 = _context5['catch'](6);

            (_log || _load_log()).default.warn(ENABLE_WSL);
            throw _context5.t0;

          case 15:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this, [[6, 11]]);
  }));

  return function prepareLocalAuth() {
    return _ref7.apply(this, arguments);
  };
}();

var spawnAndCollectJSONOutputAsync = function () {
  var _ref8 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee6(program, args) {
    var prgm, cmd;
    return (_regenerator || _load_regenerator()).default.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            prgm = program;
            cmd = args;
            return _context6.abrupt('return', (_promise || _load_promise()).default.race([new (_promise || _load_promise()).default(function (resolve, reject) {
              setTimeout(function () {
                return reject(new Error(timeout_msg(prgm, cmd)));
              }, TIMEOUT);
            }), new (_promise || _load_promise()).default(function (resolve, reject) {
              var jsonContent = [];
              try {
                if (process.platform === 'win32') {
                  prgm = WSL_BASH;
                  cmd = ['-c', WSL_ONLY_PATH + ' /mnt/c' + windowsToWSLPath(program) + ' ' + args.join(' ')];
                  var child = _child_process.default.spawn(prgm, cmd, opts);
                } else {
                  var child = _child_process.default.spawn(prgm, cmd, opts);
                }
              } catch (e) {
                return reject(e);
              }
              child.stdout.on('data', function (d) {
                return console.log(d.toString());
              });
              // This is where we get our replies back from the ruby code
              child.stderr.on('data', function (d) {
                return jsonContent.push(d);
              });
              child.stdout.on('end', function () {
                var reply = Buffer.concat(jsonContent).toString();
                try {
                  resolve(JSON.parse(reply));
                } catch (e) {
                  reject({
                    result: 'failure',
                    reason: reply.match(/Bundler::InstallError/) === null ? 'Could not understand JSON reply from Ruby based local auth scripts' : USER_PERMISSIONS_ERROR,
                    rawDump: reply
                  });
                }
              });
            })]));

          case 3:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, this);
  }));

  return function spawnAndCollectJSONOutputAsync(_x5, _x6) {
    return _ref8.apply(this, arguments);
  };
}();

exports.createAppOnPortal = createAppOnPortal;
exports.ensureAppIdLocally = ensureAppIdLocally;
exports.produceProvisionProfile = produceProvisionProfile;
exports.producePushCerts = producePushCerts;
exports.produceCerts = produceCerts;

var _child_process = _interopRequireDefault(require('child_process'));

var _slash;

function _load_slash() {
  return _slash = _interopRequireDefault(require('slash'));
}

var _spawnAsync;

function _load_spawnAsync() {
  return _spawnAsync = _interopRequireDefault(require('@expo/spawn-async'));
}

var _path = require('path');

var _inquirer;

function _load_inquirer() {
  return _inquirer = _interopRequireDefault(require('inquirer'));
}

var _fsExtra;

function _load_fsExtra() {
  return _fsExtra = _interopRequireDefault(require('fs-extra'));
}

var _os = require('os');

var _log;

function _load_log() {
  return _log = _interopRequireDefault(require('../../log'));
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Getting an undefined anywhere here probably means a ruby script is throwing an exception
var FASTLANE = process.platform === 'darwin' ? require('@expo/traveling-fastlane-darwin')() : require('@expo/traveling-fastlane-linux')();

var WSL_BASH = 'C:\\Windows\\system32\\bash.exe';

var WSL_ONLY_PATH = 'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin';

var NO_BUNDLE_ID = exports.NO_BUNDLE_ID = 'App could not be found for bundle id';

var MULTIPLE_PROFILES = exports.MULTIPLE_PROFILES = 'Multiple profiles found with the name';

var DEBUG = exports.DEBUG = process.env.EXPO_DEBUG && process.env.EXPO_DEBUG === 'true';

var ENABLE_WSL = '\nDoes not seem like WSL enabled on this machine. Download from the Windows app\nstore a distribution of Linux, then in an admin powershell, please run:\n\nEnable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux\n';

var doesFileProvidedExist = exports.doesFileProvidedExist = function () {
  var _ref = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee(printOut, p12Path) {
    var stats;
    return (_regenerator || _load_regenerator()).default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.prev = 0;
            _context.next = 3;
            return (_fsExtra || _load_fsExtra()).default.stat(p12Path);

          case 3:
            stats = _context.sent;
            return _context.abrupt('return', stats.isFile());

          case 7:
            _context.prev = 7;
            _context.t0 = _context['catch'](0);

            if (printOut) {
              console.log('\nFile does not exist.');
            }
            return _context.abrupt('return', false);

          case 11:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, undefined, [[0, 7]]);
  }));

  return function doesFileProvidedExist(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();

var doFastlaneActionsExist = exports.doFastlaneActionsExist = function () {
  var _ref2 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee3() {
    return (_regenerator || _load_regenerator()).default.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            return _context3.abrupt('return', (_promise || _load_promise()).default.all((0, (_keys || _load_keys()).default)(FASTLANE).map(function () {
              var _ref3 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee2(action) {
                var path;
                return (_regenerator || _load_regenerator()).default.wrap(function _callee2$(_context2) {
                  while (1) {
                    switch (_context2.prev = _context2.next) {
                      case 0:
                        path = FASTLANE[action];
                        _context2.t0 = action;
                        _context2.t1 = path;
                        _context2.next = 5;
                        return doesFileProvidedExist(false, path);

                      case 5:
                        _context2.t2 = _context2.sent;
                        return _context2.abrupt('return', {
                          action: _context2.t0,
                          path: _context2.t1,
                          doesExist: _context2.t2
                        });

                      case 7:
                      case 'end':
                        return _context2.stop();
                    }
                  }
                }, _callee2, undefined);
              }));

              return function (_x3) {
                return _ref3.apply(this, arguments);
              };
            }())));

          case 1:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, undefined);
  }));

  return function doFastlaneActionsExist() {
    return _ref2.apply(this, arguments);
  };
}();

function appStoreAction(creds, metadata, teamId, action) {
  var args = [action, creds.appleId, creds.password, teamId, metadata.bundleIdentifier, metadata.experienceName];
  return spawnAndCollectJSONOutputAsync(FASTLANE.app_management, args);
}

function createAppOnPortal(creds, metadata, teamId) {
  return appStoreAction(creds, metadata, teamId, 'create');
}

function ensureAppIdLocally(creds, metadata, teamId) {
  return appStoreAction(creds, metadata, teamId, 'verify');
}

function produceProvisionProfile(credentials, _ref4, teamId) {
  var bundleIdentifier = _ref4.bundleIdentifier;

  return spawnAndCollectJSONOutputAsync(FASTLANE.fetch_new_provisioning_profile, [credentials.appleId, credentials.password, bundleIdentifier, teamId]);
}

function producePushCerts(credentials, _ref5, teamId) {
  var bundleIdentifier = _ref5.bundleIdentifier;

  return spawnAndCollectJSONOutputAsync(FASTLANE.fetch_push_cert, [credentials.appleId, credentials.password, bundleIdentifier, teamId]);
}

function produceCerts(credentials, teamId) {
  return spawnAndCollectJSONOutputAsync(FASTLANE.fetch_cert, [credentials.appleId, credentials.password, teamId]);
}

var NO_TEAM_ID = 'You have no team ID associated with your apple account, cannot proceed.\n(Do you have a paid Apple developer Account?)';

var windowsToWSLPath = function windowsToWSLPath(p) {
  var noSlashes = (0, (_slash || _load_slash()).default)(p);
  return noSlashes.slice(2, noSlashes.length);
};
var MINUTES = 10;
var TIMEOUT = 60 * 1000 * MINUTES;

var timeout_msg = function timeout_msg(prgm, args) {
  return process.platform === 'win32' ? 'Took too long (limit is ' + MINUTES + ' minutes) to execute ' + prgm + ' ' + args + '.\nIs your WSL working? in Powershell try: bash.exe -c \'uname\'' : 'Took too long (limit is ' + MINUTES + ' minutes) to execute ' + prgm + ' ' + args;
};

var opts = { stdio: ['inherit', 'pipe', 'pipe'] };

var USER_PERMISSIONS_ERROR = 'You probably do not have user permissions for where exp is installed, consider changing permissions there';
//# sourceMappingURL=../../__sourcemaps__/commands/build/auth.js.map
