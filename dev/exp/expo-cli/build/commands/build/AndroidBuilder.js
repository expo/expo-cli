'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _regenerator;

function _load_regenerator() {
  return _regenerator = _interopRequireDefault(require('babel-runtime/regenerator'));
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

var _chalk;

function _load_chalk() {
  return _chalk = _interopRequireDefault(require('chalk'));
}

var _log;

function _load_log() {
  return _log = _interopRequireDefault(require('../../log'));
}

var _BaseBuilder2;

function _load_BaseBuilder() {
  return _BaseBuilder2 = _interopRequireDefault(require('./BaseBuilder'));
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var AndroidBuilder = function (_BaseBuilder) {
  (0, (_inherits2 || _load_inherits()).default)(AndroidBuilder, _BaseBuilder);

  function AndroidBuilder() {
    (0, (_classCallCheck2 || _load_classCallCheck()).default)(this, AndroidBuilder);
    return (0, (_possibleConstructorReturn2 || _load_possibleConstructorReturn()).default)(this, (AndroidBuilder.__proto__ || (0, (_getPrototypeOf || _load_getPrototypeOf()).default)(AndroidBuilder)).apply(this, arguments));
  }

  (0, (_createClass2 || _load_createClass()).default)(AndroidBuilder, [{
    key: 'run',
    value: function () {
      var _ref = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee() {
        var publishedExpIds;
        return (_regenerator || _load_regenerator()).default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return this.checkStatus();

              case 2:
                _context.next = 4;
                return this.collectAndValidateCredentials();

              case 4:
                _context.next = 6;
                return this.ensureReleaseExists('android');

              case 6:
                publishedExpIds = _context.sent;
                _context.next = 9;
                return this.build(publishedExpIds, 'android');

              case 9:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function run() {
        return _ref.apply(this, arguments);
      }

      return run;
    }()
  }, {
    key: '_clearCredentials',
    value: function () {
      var _ref2 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee2() {
        var _ref3, _ref3$args, username, remotePackageName, experienceName, credentialMetadata, localKeystorePath, localKeystoreExists, questions, answers;

        return (_regenerator || _load_regenerator()).default.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return (_xdl || _load_xdl()).Exp.getPublishInfoAsync(this.projectDir);

              case 2:
                _ref3 = _context2.sent;
                _ref3$args = _ref3.args;
                username = _ref3$args.username;
                remotePackageName = _ref3$args.remotePackageName;
                experienceName = _ref3$args.remoteFullPackageName;
                credentialMetadata = {
                  username: username,
                  experienceName: experienceName,
                  platform: 'android'
                };
                localKeystorePath = _path.default.resolve(remotePackageName + '.jks');
                localKeystoreExists = (_fsExtra || _load_fsExtra()).default.existsSync(localKeystorePath);

                if (localKeystoreExists) {
                  (_log || _load_log()).default.warn('Detected a local copy of an Android keystore. Please double check that the keystore is up to date so it can be used as a backup.');
                } else {
                  (_log || _load_log()).default.warn('Cannot find a local keystore in the current project directory.');
                  (_log || _load_log()).default.warn('Can you make sure you have a local backup of your keystore?');
                  (_log || _load_log()).default.warn('You can fetch an updated version from our servers by using `exp fetch:android:keystore [project-dir]`');
                }
                (_log || _load_log()).default.warn('Clearing your Android build credentials from our build servers is a ' + (_chalk || _load_chalk()).default.red('PERMANENT and IRREVERSIBLE action.'));
                (_log || _load_log()).default.warn('Android keystores must be identical to the one previously used to submit your app to the Google Play Store.');
                (_log || _load_log()).default.warn('Please read https://docs.expo.io/versions/latest/guides/building-standalone-apps.html#if-you-choose-to-build-for-android for more info before proceeding.');
                questions = [{
                  type: 'confirm',
                  name: 'confirm',
                  message: 'Permanently delete the Android build credentials from our servers?'
                }];
                _context2.next = 17;
                return (_inquirer || _load_inquirer()).default.prompt(questions);

              case 17:
                answers = _context2.sent;

                if (!answers.confirm) {
                  _context2.next = 21;
                  break;
                }

                _context2.next = 21;
                return (_xdl || _load_xdl()).Credentials.removeCredentialsForPlatform('android', credentialMetadata);

              case 21:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function _clearCredentials() {
        return _ref2.apply(this, arguments);
      }

      return _clearCredentials;
    }()
  }, {
    key: 'collectAndValidateCredentials',
    value: function () {
      var _ref4 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee4() {
        var _this2 = this;

        var _ref5, _ref5$args, username, experienceName, credentialMetadata, credentials, questions, answers, keystorePath, keystoreAlias, keystorePassword, keyPassword, keystoreData, _credentials;

        return (_regenerator || _load_regenerator()).default.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return (_xdl || _load_xdl()).Exp.getPublishInfoAsync(this.projectDir);

              case 2:
                _ref5 = _context4.sent;
                _ref5$args = _ref5.args;
                username = _ref5$args.username;
                experienceName = _ref5$args.remoteFullPackageName;
                credentialMetadata = {
                  username: username,
                  experienceName: experienceName,
                  platform: 'android'
                };
                _context4.next = 9;
                return (_xdl || _load_xdl()).Credentials.credentialsExistForPlatformAsync(credentialMetadata);

              case 9:
                credentials = _context4.sent;

                if (!(this.options.clearCredentials || !credentials)) {
                  _context4.next = 30;
                  break;
                }

                console.log('');
                questions = [{
                  type: 'rawlist',
                  name: 'uploadKeystore',
                  message: 'Would you like to upload a keystore or have us generate one for you?\nIf you don\'t know what this means, let us handle it! :)\n',
                  choices: [{ name: 'Let Expo handle the process!', value: false }, { name: 'I want to upload my own keystore!', value: true }]
                }, {
                  type: 'input',
                  name: 'keystorePath',
                  message: 'Path to keystore:',
                  validate: function () {
                    var _ref6 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee3(keystorePath) {
                      var keystorePathStats;
                      return (_regenerator || _load_regenerator()).default.wrap(function _callee3$(_context3) {
                        while (1) {
                          switch (_context3.prev = _context3.next) {
                            case 0:
                              _context3.prev = 0;
                              _context3.next = 3;
                              return (_fsExtra || _load_fsExtra()).default.stat(keystorePath);

                            case 3:
                              keystorePathStats = _context3.sent;
                              return _context3.abrupt('return', keystorePathStats.isFile());

                            case 7:
                              _context3.prev = 7;
                              _context3.t0 = _context3['catch'](0);

                              // file does not exist
                              console.log('\nFile does not exist.');
                              return _context3.abrupt('return', false);

                            case 11:
                            case 'end':
                              return _context3.stop();
                          }
                        }
                      }, _callee3, _this2, [[0, 7]]);
                    }));

                    return function validate(_x) {
                      return _ref6.apply(this, arguments);
                    };
                  }(),
                  filter: function filter(keystorePath) {
                    keystorePath = (0, (_untildify || _load_untildify()).default)(keystorePath);
                    if (!_path.default.isAbsolute(keystorePath)) {
                      keystorePath = _path.default.resolve(keystorePath);
                    }
                    return keystorePath;
                  },
                  when: function when(answers) {
                    return answers.uploadKeystore;
                  }
                }, {
                  type: 'input',
                  name: 'keystoreAlias',
                  message: 'Keystore Alias:',
                  validate: function validate(val) {
                    return val !== '';
                  },
                  when: function when(answers) {
                    return answers.uploadKeystore;
                  }
                }, {
                  type: 'password',
                  name: 'keystorePassword',
                  message: 'Keystore Password:',
                  validate: function validate(val) {
                    return val !== '';
                  },
                  when: function when(answers) {
                    return answers.uploadKeystore;
                  }
                }, {
                  type: 'password',
                  name: 'keyPassword',
                  message: 'Key Password:',
                  validate: function validate(password, answers) {
                    if (password === '') {
                      return false;
                    }
                    // Todo validate keystore passwords
                    return true;
                  },
                  when: function when(answers) {
                    return answers.uploadKeystore;
                  }
                }];
                _context4.next = 15;
                return (_inquirer || _load_inquirer()).default.prompt(questions);

              case 15:
                answers = _context4.sent;

                if (answers.uploadKeystore) {
                  _context4.next = 23;
                  break;
                }

                if (!this.options.clearCredentials) {
                  _context4.next = 20;
                  break;
                }

                _context4.next = 20;
                return this._clearCredentials();

              case 20:
                return _context4.abrupt('return');

              case 23:
                keystorePath = answers.keystorePath, keystoreAlias = answers.keystoreAlias, keystorePassword = answers.keystorePassword, keyPassword = answers.keyPassword;

                // read the keystore

                _context4.next = 26;
                return (_fsExtra || _load_fsExtra()).default.readFile(keystorePath);

              case 26:
                keystoreData = _context4.sent;
                _credentials = {
                  keystore: keystoreData.toString('base64'),
                  keystoreAlias: keystoreAlias,
                  keystorePassword: keystorePassword,
                  keyPassword: keyPassword
                };
                _context4.next = 30;
                return (_xdl || _load_xdl()).Credentials.updateCredentialsForPlatform('android', _credentials, credentialMetadata);

              case 30:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function collectAndValidateCredentials() {
        return _ref4.apply(this, arguments);
      }

      return collectAndValidateCredentials;
    }()
  }]);
  return AndroidBuilder;
}((_BaseBuilder2 || _load_BaseBuilder()).default);

exports.default = AndroidBuilder;
module.exports = exports['default'];
//# sourceMappingURL=../../__sourcemaps__/commands/build/AndroidBuilder.js.map
