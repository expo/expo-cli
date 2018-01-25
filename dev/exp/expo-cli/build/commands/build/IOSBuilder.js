'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _toConsumableArray2;

function _load_toConsumableArray() {
  return _toConsumableArray2 = _interopRequireDefault(require('babel-runtime/helpers/toConsumableArray'));
}

var _objectWithoutProperties2;

function _load_objectWithoutProperties() {
  return _objectWithoutProperties2 = _interopRequireDefault(require('babel-runtime/helpers/objectWithoutProperties'));
}

var _getIterator2;

function _load_getIterator() {
  return _getIterator2 = _interopRequireDefault(require('babel-runtime/core-js/get-iterator'));
}

var _extends2;

function _load_extends() {
  return _extends2 = _interopRequireDefault(require('babel-runtime/helpers/extends'));
}

var _keys;

function _load_keys() {
  return _keys = _interopRequireDefault(require('babel-runtime/core-js/object/keys'));
}

var _regenerator;

function _load_regenerator() {
  return _regenerator = _interopRequireDefault(require('babel-runtime/regenerator'));
}

var _stringify;

function _load_stringify() {
  return _stringify = _interopRequireDefault(require('babel-runtime/core-js/json/stringify'));
}

var _asyncToGenerator2;

function _load_asyncToGenerator() {
  return _asyncToGenerator2 = _interopRequireDefault(require('babel-runtime/helpers/asyncToGenerator'));
}

var _getPrototypeOf;

function _load_getPrototypeOf() {
  return _getPrototypeOf = _interopRequireDefault(require('babel-runtime/core-js/object/get-prototype-of'));
}

var _classCallCheck2;

function _load_classCallCheck() {
  return _classCallCheck2 = _interopRequireDefault(require('babel-runtime/helpers/classCallCheck'));
}

var _createClass2;

function _load_createClass() {
  return _createClass2 = _interopRequireDefault(require('babel-runtime/helpers/createClass'));
}

var _possibleConstructorReturn2;

function _load_possibleConstructorReturn() {
  return _possibleConstructorReturn2 = _interopRequireDefault(require('babel-runtime/helpers/possibleConstructorReturn'));
}

var _inherits2;

function _load_inherits() {
  return _inherits2 = _interopRequireDefault(require('babel-runtime/helpers/inherits'));
}

var _set;

function _load_set() {
  return _set = _interopRequireDefault(require('babel-runtime/core-js/set'));
}

var _fsExtra;

function _load_fsExtra() {
  return _fsExtra = _interopRequireDefault(require('fs-extra'));
}

var _path = _interopRequireDefault(require('path'));

var _inquirer;

function _load_inquirer() {
  return _inquirer = _interopRequireDefault(require('inquirer'));
}

var _untildify;

function _load_untildify() {
  return _untildify = _interopRequireDefault(require('untildify'));
}

var _xdl;

function _load_xdl() {
  return _xdl = require('xdl');
}

var _ora;

function _load_ora() {
  return _ora = _interopRequireDefault(require('ora'));
}

var _chalk;

function _load_chalk() {
  return _chalk = _interopRequireDefault(require('chalk'));
}

var _BaseBuilder2;

function _load_BaseBuilder() {
  return _BaseBuilder2 = _interopRequireDefault(require('./BaseBuilder'));
}

var _log;

function _load_log() {
  return _log = _interopRequireDefault(require('../../log'));
}

var _auth;

function _load_auth() {
  return _auth = _interopRequireWildcard(require('./auth'));
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var nonEmptyInput = function nonEmptyInput(val) {
  return val !== '';
};

var expertPrompt = '\nWARNING! In this mode, we won\'t be able to make sure your certificates,\nor provisioning profile are valid. Please double check that you\'re\nuploading valid files for your app otherwise you may encounter strange errors!\n\nMake sure you\'ve created your app ID on the developer portal, that your app ID\nis in app.json as `bundleIdentifier`, and that the provisioning profile you\nupload matches that team ID and app ID.\n';

var produceAbsolutePath = function produceAbsolutePath(p12Path) {
  p12Path = (0, (_untildify || _load_untildify()).default)(p12Path);
  if (!_path.default.isAbsolute(p12Path)) {
    p12Path = _path.default.resolve(p12Path);
  }
  return p12Path;
};

var runAsExpertQuestion = {
  type: 'list',
  name: 'isExpoManaged',
  message: 'How would you like to upload your credentials?\n',
  choices: [{ name: 'Expo handles all credentials, you can still provide overrides', value: true }, {
    name: 'I will provide all the credentials and files needed, Expo does limited validation',
    value: false
  }]
};

var OBLIGATORY_CREDS_KEYS = new (_set || _load_set()).default(['certP12', 'certPassword', 'pushP12', 'pushPassword', 'provisioningProfile', 'teamId']);

var LET_EXPO_HANDLE = 'Let Expo handle the process';

var I_PROVIDE_FILE = 'I want to upload my own file';

var OVERRIDE_CHOICES = [{ name: LET_EXPO_HANDLE, value: true }, { name: I_PROVIDE_FILE, value: false }];

var whatToOverride = [{
  type: 'list',
  name: 'distCert',
  message: 'Will you provide your own Distribution Certificate?',
  choices: OVERRIDE_CHOICES
}, {
  type: 'list',
  name: 'pushCert',
  message: 'Will you provide your own Push Certificate?',
  choices: OVERRIDE_CHOICES
}];

var provisionProfilePath = {
  type: 'input',
  name: 'pathToProvisioningProfile',
  message: 'Path to your .mobile provisioning Profile',
  validate: (_auth || _load_auth()).doesFileProvidedExist.bind(null, true),
  filter: produceAbsolutePath
};

var sharedQuestions = [{
  type: 'input',
  name: 'pathToP12',
  message: 'Path to P12 file:',
  validate: (_auth || _load_auth()).doesFileProvidedExist.bind(null, true),
  filter: produceAbsolutePath
}, {
  type: 'password',
  name: 'p12Password',
  message: 'P12 password:',
  validate: function validate(password) {
    return password.length > 0;
  }
}];

var appleCredsQuestions = [{
  type: 'input',
  name: 'appleId',
  message: 'What\'s your Apple ID?',
  validate: nonEmptyInput
}, {
  type: 'password',
  name: 'password',
  message: 'Password?',
  validate: nonEmptyInput
}];

var IOSBuilder = function (_BaseBuilder) {
  (0, (_inherits2 || _load_inherits()).default)(IOSBuilder, _BaseBuilder);

  function IOSBuilder() {
    (0, (_classCallCheck2 || _load_classCallCheck()).default)(this, IOSBuilder);
    return (0, (_possibleConstructorReturn2 || _load_possibleConstructorReturn()).default)(this, (IOSBuilder.__proto__ || (0, (_getPrototypeOf || _load_getPrototypeOf()).default)(IOSBuilder)).apply(this, arguments));
  }

  (0, (_createClass2 || _load_createClass()).default)(IOSBuilder, [{
    key: 'run',
    value: function () {
      var _ref = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee() {
        var _ref2, _ref2$args, username, experienceName, bundleIdentifier, credentialMetadata, publishedExpIds;

        return (_regenerator || _load_regenerator()).default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return (_xdl || _load_xdl()).Exp.getPublishInfoAsync(this.projectDir);

              case 2:
                _ref2 = _context.sent;
                _ref2$args = _ref2.args;
                username = _ref2$args.username;
                experienceName = _ref2$args.remoteFullPackageName;
                bundleIdentifier = _ref2$args.bundleIdentifierIOS;

                if (bundleIdentifier) {
                  _context.next = 9;
                  break;
                }

                throw new (_xdl || _load_xdl()).XDLError((_xdl || _load_xdl()).ErrorCode.INVALID_OPTIONS, 'Your project must have a bundleIdentifier set in app.json.\nSee https://docs.expo.io/versions/latest/guides/building-standalone-apps.html');

              case 9:
                _context.next = 11;
                return this.checkStatus();

              case 11:
                credentialMetadata = { username: username, experienceName: experienceName, bundleIdentifier: bundleIdentifier, platform: 'ios' };
                // Clear credentials if they want to:

                if (!this.options.clearCredentials) {
                  _context.next = 16;
                  break;
                }

                _context.next = 15;
                return (_xdl || _load_xdl()).Credentials.removeCredentialsForPlatform('ios', credentialMetadata);

              case 15:
                (_log || _load_log()).default.warn('Removed existing credentials');

              case 16:
                if (!(this.options.type !== 'simulator')) {
                  _context.next = 35;
                  break;
                }

                _context.prev = 17;

                if (!(_auth || _load_auth()).DEBUG) {
                  _context.next = 24;
                  break;
                }

                _context.t0 = console;
                _context.next = 22;
                return (_auth || _load_auth()).doFastlaneActionsExist();

              case 22:
                _context.t1 = _context.sent;

                _context.t0.log.call(_context.t0, _context.t1);

              case 24:
                _context.next = 26;
                return (_auth || _load_auth()).prepareLocalAuth();

              case 26:
                _context.next = 28;
                return this.runLocalAuth(credentialMetadata);

              case 28:
                _context.next = 35;
                break;

              case 30:
                _context.prev = 30;
                _context.t2 = _context['catch'](17);

                (_log || _load_log()).default.error('Error while gathering & validating credentials');
                if ((_auth || _load_auth()).DEBUG) {
                  if (_context.t2.stdout !== undefined) {
                    // sometimes WSL adds null characters
                    (_log || _load_log()).default.error(_context.t2.stdout.replace(/\0/g, ''));
                  } else {
                    (_log || _load_log()).default.error((0, (_stringify || _load_stringify()).default)(_context.t2));
                  }
                }
                throw _context.t2;

              case 35:
                _context.next = 37;
                return this.ensureReleaseExists('ios');

              case 37:
                publishedExpIds = _context.sent;
                _context.next = 40;
                return this.build(publishedExpIds, 'ios');

              case 40:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this, [[17, 30]]);
      }));

      function run() {
        return _ref.apply(this, arguments);
      }

      return run;
    }()
  }, {
    key: 'runningAsExpert',
    value: function () {
      var _ref3 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee2(credsStarter) {
        var _arr, _i, choice;

        return (_regenerator || _load_regenerator()).default.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                (0, (_log || _load_log()).default)(expertPrompt);
                _arr = ['distCert', 'pushCert', 'provisioningProfile'];
                _i = 0;

              case 3:
                if (!(_i < _arr.length)) {
                  _context2.next = 10;
                  break;
                }

                choice = _arr[_i];
                _context2.next = 7;
                return this.userProvidedOverride(credsStarter, choice);

              case 7:
                _i++;
                _context2.next = 3;
                break;

              case 10:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function runningAsExpert(_x) {
        return _ref3.apply(this, arguments);
      }

      return runningAsExpert;
    }()

    // End user wants to override these credentials, that is, they want
    // to provide their own creds

  }, {
    key: 'userProvidedOverride',
    value: function () {
      var _ref4 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee3(credsStarter, choice) {
        var distCertValues, pushCertValues, _ref5, pathToProvisioningProfile;

        return (_regenerator || _load_regenerator()).default.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.t0 = choice;
                _context3.next = _context3.t0 === 'distCert' ? 3 : _context3.t0 === 'pushCert' ? 16 : _context3.t0 === 'provisioningProfile' ? 29 : 42;
                break;

              case 3:
                (0, (_log || _load_log()).default)('Please provide your distribution certificate P12:');
                _context3.next = 6;
                return (_inquirer || _load_inquirer()).default.prompt(sharedQuestions);

              case 6:
                distCertValues = _context3.sent;
                _context3.t1 = this;
                _context3.t2 = credsStarter;
                _context3.next = 11;
                return (_fsExtra || _load_fsExtra()).default.readFile(distCertValues.pathToP12);

              case 11:
                _context3.t3 = _context3.sent.toString('base64');
                _context3.t4 = distCertValues.p12Password;
                _context3.t5 = {
                  certP12: _context3.t3,
                  certPassword: _context3.t4
                };

                _context3.t1._copyOverAsString.call(_context3.t1, _context3.t2, _context3.t5);

                return _context3.abrupt('break', 43);

              case 16:
                (0, (_log || _load_log()).default)('Please provide the path to your push notification cert P12');
                _context3.next = 19;
                return (_inquirer || _load_inquirer()).default.prompt(sharedQuestions);

              case 19:
                pushCertValues = _context3.sent;
                _context3.t6 = this;
                _context3.t7 = credsStarter;
                _context3.next = 24;
                return (_fsExtra || _load_fsExtra()).default.readFile(pushCertValues.pathToP12);

              case 24:
                _context3.t8 = _context3.sent.toString('base64');
                _context3.t9 = pushCertValues.p12Password;
                _context3.t10 = {
                  pushP12: _context3.t8,
                  pushPassword: _context3.t9
                };

                _context3.t6._copyOverAsString.call(_context3.t6, _context3.t7, _context3.t10);

                return _context3.abrupt('break', 43);

              case 29:
                (0, (_log || _load_log()).default)('Please provide the path to your .mobile provisioning profile');
                _context3.next = 32;
                return (_inquirer || _load_inquirer()).default.prompt(provisionProfilePath);

              case 32:
                _ref5 = _context3.sent;
                pathToProvisioningProfile = _ref5.pathToProvisioningProfile;
                _context3.t11 = this;
                _context3.t12 = credsStarter;
                _context3.next = 38;
                return (_fsExtra || _load_fsExtra()).default.readFile(pathToProvisioningProfile);

              case 38:
                _context3.t13 = _context3.sent.toString('base64');
                _context3.t14 = {
                  provisioningProfile: _context3.t13
                };

                _context3.t11._copyOverAsString.call(_context3.t11, _context3.t12, _context3.t14);

                return _context3.abrupt('break', 43);

              case 42:
                throw new Error('Unknown choice to override: ' + choice);

              case 43:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function userProvidedOverride(_x2, _x3) {
        return _ref4.apply(this, arguments);
      }

      return userProvidedOverride;
    }()
  }, {
    key: '_copyOverAsString',
    value: function _copyOverAsString(credsStarter, authActionAttempt) {
      (0, (_keys || _load_keys()).default)(authActionAttempt).forEach(function (k) {
        var isString = typeof authActionAttempt[k] === 'string';
        if (isString) {
          credsStarter[k] = authActionAttempt[k];
        } else {
          credsStarter[k] = (0, (_stringify || _load_stringify()).default)(authActionAttempt[k]);
        }
      });
    }
  }, {
    key: '_ensureAppExists',
    value: function () {
      var _ref6 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee4(appleCreds, credsMetadata, teamId, credsStarter) {
        var checkAppExistenceAttempt;
        return (_regenerator || _load_regenerator()).default.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return (_auth || _load_auth()).ensureAppIdLocally(appleCreds, credsMetadata, teamId);

              case 2:
                checkAppExistenceAttempt = _context4.sent;

                if (!(checkAppExistenceAttempt.result === 'failure' && checkAppExistenceAttempt.reason.startsWith((_auth || _load_auth()).NO_BUNDLE_ID))) {
                  _context4.next = 7;
                  break;
                }

                _context4.next = 6;
                return (_auth || _load_auth()).createAppOnPortal(appleCreds, credsMetadata, teamId);

              case 6:
                checkAppExistenceAttempt = _context4.sent;

              case 7:
                this._throwIfFailureWithReasonDump(checkAppExistenceAttempt);
                this._copyOverAsString(credsStarter, checkAppExistenceAttempt);

              case 9:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function _ensureAppExists(_x4, _x5, _x6, _x7) {
        return _ref6.apply(this, arguments);
      }

      return _ensureAppExists;
    }()
  }, {
    key: 'produceProvisionProfile',
    value: function () {
      var _ref7 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee5(appleCreds, credsMetadata, teamId, credsStarter) {
        var produceProvisionProfileAttempt;
        return (_regenerator || _load_regenerator()).default.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                _context5.next = 2;
                return (_auth || _load_auth()).produceProvisionProfile(appleCreds, credsMetadata, teamId);

              case 2:
                produceProvisionProfileAttempt = _context5.sent;

                if (produceProvisionProfileAttempt.result === 'failure' && produceProvisionProfileAttempt.reason.startsWith((_auth || _load_auth()).MULTIPLE_PROFILES)) {
                  (_log || _load_log()).default.warn('Consider logging into https://developer.apple.com and removing the existing provisioning profile');
                }
                this._throwIfFailureWithReasonDump(produceProvisionProfileAttempt);
                this._copyOverAsString(credsStarter, produceProvisionProfileAttempt);

              case 6:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function produceProvisionProfile(_x8, _x9, _x10, _x11) {
        return _ref7.apply(this, arguments);
      }

      return produceProvisionProfile;
    }()
  }, {
    key: 'expoManagedResource',
    value: function () {
      var _ref8 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee6(credsStarter, choice, appleCreds, teamId, credsMetadata) {
        var produceCertAttempt, producePushCertsAttempt;
        return (_regenerator || _load_regenerator()).default.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                _context6.t0 = choice;
                _context6.next = _context6.t0 === 'distCert' ? 3 : _context6.t0 === 'pushCert' ? 9 : _context6.t0 === 'provisioningProfile' ? 15 : 18;
                break;

              case 3:
                _context6.next = 5;
                return (_auth || _load_auth()).produceCerts(appleCreds, teamId);

              case 5:
                produceCertAttempt = _context6.sent;

                this._throwIfFailureWithReasonDump(produceCertAttempt);
                this._copyOverAsString(credsStarter, produceCertAttempt);
                return _context6.abrupt('break', 19);

              case 9:
                _context6.next = 11;
                return (_auth || _load_auth()).producePushCerts(appleCreds, credsMetadata, teamId);

              case 11:
                producePushCertsAttempt = _context6.sent;

                this._throwIfFailureWithReasonDump(producePushCertsAttempt);
                this._copyOverAsString(credsStarter, producePushCertsAttempt);
                return _context6.abrupt('break', 19);

              case 15:
                _context6.next = 17;
                return this.produceProvisionProfile(appleCreds, credsMetadata, teamId, credsStarter);

              case 17:
                return _context6.abrupt('break', 19);

              case 18:
                throw new Error('Unknown manage resource choice requested: ' + choice);

              case 19:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function expoManagedResource(_x12, _x13, _x14, _x15, _x16) {
        return _ref8.apply(this, arguments);
      }

      return expoManagedResource;
    }()
  }, {
    key: '_validateCredsEnsureAppExists',
    value: function () {
      var _ref9 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee7(credsStarter, credsMetadata, justTeamId) {
        var appleCredentials, checkCredsAttempt;
        return (_regenerator || _load_regenerator()).default.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                _context7.next = 2;
                return this.askForAppleCreds(justTeamId);

              case 2:
                appleCredentials = _context7.sent;

                (0, (_log || _load_log()).default)('Validating Credentials...');
                _context7.next = 6;
                return (_auth || _load_auth()).validateCredentialsProduceTeamId(appleCredentials);

              case 6:
                checkCredsAttempt = _context7.sent;

                this._throwIfFailureWithReasonDump(checkCredsAttempt);
                credsStarter.teamId = checkCredsAttempt.teamId;
                _context7.next = 11;
                return this._ensureAppExists(appleCredentials, credsMetadata, checkCredsAttempt.teamId, credsStarter);

              case 11:
                return _context7.abrupt('return', appleCredentials);

              case 12:
              case 'end':
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function _validateCredsEnsureAppExists(_x17, _x18, _x19) {
        return _ref9.apply(this, arguments);
      }

      return _validateCredsEnsureAppExists;
    }()
  }, {
    key: 'runningAsExpoManaged',
    value: function () {
      var _ref10 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee8(appleCredentials, credsStarter, credsMetadata) {
        var expoManages, spinner, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, choice;

        return (_regenerator || _load_regenerator()).default.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                _context8.t0 = (_extends2 || _load_extends()).default;
                _context8.t1 = {};
                _context8.next = 4;
                return (_inquirer || _load_inquirer()).default.prompt(whatToOverride);

              case 4:
                _context8.t2 = _context8.sent;
                _context8.t3 = { provisioningProfile: true };
                expoManages = (0, _context8.t0)(_context8.t1, _context8.t2, _context8.t3);
                spinner = (0, (_ora || _load_ora()).default)('Running local authentication and producing required credentials').start();
                _context8.prev = 8;
                _iteratorNormalCompletion = true;
                _didIteratorError = false;
                _iteratorError = undefined;
                _context8.prev = 12;
                _iterator = (0, (_getIterator2 || _load_getIterator()).default)((0, (_keys || _load_keys()).default)(expoManages));

              case 14:
                if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
                  _context8.next = 29;
                  break;
                }

                choice = _step.value;

                spinner.text = 'Now producing files for ' + choice;

                if (!expoManages[choice]) {
                  _context8.next = 23;
                  break;
                }

                spinner.start();
                _context8.next = 21;
                return this.expoManagedResource(credsStarter, choice, appleCredentials, credsStarter.teamId, credsMetadata);

              case 21:
                _context8.next = 26;
                break;

              case 23:
                spinner.stop();
                _context8.next = 26;
                return this.userProvidedOverride(credsStarter, choice);

              case 26:
                _iteratorNormalCompletion = true;
                _context8.next = 14;
                break;

              case 29:
                _context8.next = 35;
                break;

              case 31:
                _context8.prev = 31;
                _context8.t4 = _context8['catch'](12);
                _didIteratorError = true;
                _iteratorError = _context8.t4;

              case 35:
                _context8.prev = 35;
                _context8.prev = 36;

                if (!_iteratorNormalCompletion && _iterator.return) {
                  _iterator.return();
                }

              case 38:
                _context8.prev = 38;

                if (!_didIteratorError) {
                  _context8.next = 41;
                  break;
                }

                throw _iteratorError;

              case 41:
                return _context8.finish(38);

              case 42:
                return _context8.finish(35);

              case 43:
                _context8.next = 48;
                break;

              case 45:
                _context8.prev = 45;
                _context8.t5 = _context8['catch'](8);
                throw _context8.t5;

              case 48:
                _context8.prev = 48;

                spinner.stop();
                return _context8.finish(48);

              case 51:
              case 'end':
                return _context8.stop();
            }
          }
        }, _callee8, this, [[8, 45, 48, 51], [12, 31, 35, 43], [36,, 38, 42]]);
      }));

      function runningAsExpoManaged(_x20, _x21, _x22) {
        return _ref10.apply(this, arguments);
      }

      return runningAsExpoManaged;
    }()
  }, {
    key: '_areCredsMissing',
    value: function _areCredsMissing(creds, action) {
      var clientHas = new (_set || _load_set()).default((0, (_keys || _load_keys()).default)(creds));
      var credsMissing = [];
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = (0, (_getIterator2 || _load_getIterator()).default)(OBLIGATORY_CREDS_KEYS.keys()), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var k = _step2.value;

          if (clientHas.has(k) === false) {
            credsMissing.push(k);
            action !== undefined && action();
          }
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      if (credsMissing.length !== 0) {
        (_log || _load_log()).default.warn('We do not have some credentials for you, ' + credsMissing);
      }
    }
  }, {
    key: 'runLocalAuth',
    value: function () {
      var _ref11 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee9(credsMetadata) {
        var credsStarter, clientHasAllNeededCreds, strategy, appleCredentials, _credsStarter, result, creds;

        return (_regenerator || _load_regenerator()).default.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                _context9.next = 2;
                return (_xdl || _load_xdl()).Credentials.credentialsExistForPlatformAsync(credsMetadata);

              case 2:
                credsStarter = _context9.sent;
                clientHasAllNeededCreds = false;

                if (credsStarter !== undefined) {
                  clientHasAllNeededCreds = true;
                  this._areCredsMissing(credsStarter, function () {
                    return clientHasAllNeededCreds = false;
                  });
                } else {
                  credsStarter = {};
                }

                if (!(clientHasAllNeededCreds === false)) {
                  _context9.next = 27;
                  break;
                }

                _context9.next = 8;
                return (_inquirer || _load_inquirer()).default.prompt(runAsExpertQuestion);

              case 8:
                strategy = _context9.sent;
                _context9.next = 11;
                return this._validateCredsEnsureAppExists(credsStarter, credsMetadata, !strategy.isExpoManaged);

              case 11:
                appleCredentials = _context9.sent;

                if (!strategy.isExpoManaged) {
                  _context9.next = 17;
                  break;
                }

                _context9.next = 15;
                return this.runningAsExpoManaged(appleCredentials, credsStarter, credsMetadata);

              case 15:
                _context9.next = 19;
                break;

              case 17:
                _context9.next = 19;
                return this.runningAsExpert(credsStarter);

              case 19:
                _credsStarter = credsStarter, result = _credsStarter.result, creds = (0, (_objectWithoutProperties2 || _load_objectWithoutProperties()).default)(_credsStarter, ['result']);

                if ((_auth || _load_auth()).DEBUG) {
                  console.log(credsStarter);
                }
                this._areCredsMissing(creds);
                _context9.next = 24;
                return (_xdl || _load_xdl()).Credentials.updateCredentialsForPlatform('ios', creds, credsMetadata);

              case 24:
                (_log || _load_log()).default.warn('Encrypted ' + [].concat((0, (_toConsumableArray2 || _load_toConsumableArray()).default)(OBLIGATORY_CREDS_KEYS.keys())) + ' and saved to expo servers');
                _context9.next = 28;
                break;

              case 27:
                (0, (_log || _load_log()).default)('Using existing credentials for this build');

              case 28:
              case 'end':
                return _context9.stop();
            }
          }
        }, _callee9, this);
      }));

      function runLocalAuth(_x23) {
        return _ref11.apply(this, arguments);
      }

      return runLocalAuth;
    }()
  }, {
    key: '_throwIfFailureWithReasonDump',
    value: function _throwIfFailureWithReasonDump(replyAttempt) {
      if ((_auth || _load_auth()).DEBUG) {
        console.log(replyAttempt);
      }
      if (replyAttempt.result === 'failure') {
        var reason = replyAttempt.reason,
            rawDump = replyAttempt.rawDump;

        throw new Error('Reason:' + reason + ', raw:' + (0, (_stringify || _load_stringify()).default)(rawDump));
      }
    }
  }, {
    key: 'askForAppleCreds',
    value: function () {
      var _ref12 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee10() {
        var justTeamId = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
        return (_regenerator || _load_regenerator()).default.wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                if (justTeamId === false) {
                  console.log('\nWe need your Apple ID/password to manage certificates and\nprovisioning profiles from your Apple Developer account.\n\nNote: Expo does not keep your Apple ID or your Apple password.\n');
                } else {
                  console.log('\nWe need your Apple ID/password to ensure the correct teamID and appID\n\nNote: Expo does not keep your Apple ID or your Apple password.\n');
                }
                return _context10.abrupt('return', (_inquirer || _load_inquirer()).default.prompt(appleCredsQuestions));

              case 2:
              case 'end':
                return _context10.stop();
            }
          }
        }, _callee10, this);
      }));

      function askForAppleCreds() {
        return _ref12.apply(this, arguments);
      }

      return askForAppleCreds;
    }()
  }]);
  return IOSBuilder;
}((_BaseBuilder2 || _load_BaseBuilder()).default);

exports.default = IOSBuilder;
module.exports = exports['default'];
//# sourceMappingURL=../../__sourcemaps__/commands/build/IOSBuilder.js.map
