'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.register = exports.login = exports.loginOrRegisterIfLoggedOut = undefined;

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

var loginOrRegisterIfLoggedOut = exports.loginOrRegisterIfLoggedOut = function () {
  var _ref = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee() {
    var questions, _ref2, action;

    return (_regenerator || _load_regenerator()).default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return (_xdl || _load_xdl()).User.getCurrentUserAsync();

          case 2:
            if (!_context.sent) {
              _context.next = 4;
              break;
            }

            return _context.abrupt('return');

          case 4:

            console.log((_chalk || _load_chalk()).default.yellow('\nAn Expo user account is required to proceed.\n'));

            questions = [{
              type: 'list',
              name: 'action',
              message: 'How would you like to authenticate?',
              choices: [{
                name: 'Make a new Expo account',
                value: 'register'
              }, {
                name: 'Log in with an existing Expo account',
                value: 'existingUser'
              }, {
                name: 'Cancel',
                value: 'cancel'
              }]
            }];
            _context.next = 8;
            return (_inquirer || _load_inquirer()).default.prompt(questions);

          case 8:
            _ref2 = _context.sent;
            action = _ref2.action;

            if (!(action === 'github')) {
              _context.next = 15;
              break;
            }

            _context.next = 13;
            return login({ github: true });

          case 13:
            _context.next = 27;
            break;

          case 15:
            if (!(action === 'register')) {
              _context.next = 21;
              break;
            }

            _context.next = 18;
            return _onboardUser();

          case 18:
            console.log((_chalk || _load_chalk()).default.green('Thanks!\n'));
            _context.next = 27;
            break;

          case 21:
            if (!(action === 'existingUser')) {
              _context.next = 26;
              break;
            }

            _context.next = 24;
            return login({});

          case 24:
            _context.next = 27;
            break;

          case 26:
            throw new (_CommandError || _load_CommandError()).default('BAD_CHOICE', 'Not logged in.');

          case 27:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function loginOrRegisterIfLoggedOut() {
    return _ref.apply(this, arguments);
  };
}();

var login = exports.login = function () {
  var _ref3 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee2(options) {
    var user, question, _ref4, action;

    return (_regenerator || _load_regenerator()).default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return (_xdl || _load_xdl()).User.getCurrentUserAsync();

          case 2:
            user = _context2.sent;

            if (options.nonInteractive) {
              _context2.next = 41;
              break;
            }

            if (!user) {
              _context2.next = 12;
              break;
            }

            question = [{
              type: 'confirm',
              name: 'action',
              message: 'You are already logged in as ' + (_chalk || _load_chalk()).default.green(user.username) + '. Log in as new user?'
            }];
            _context2.next = 8;
            return (_inquirer || _load_inquirer()).default.prompt(question);

          case 8:
            _ref4 = _context2.sent;
            action = _ref4.action;

            if (action) {
              _context2.next = 12;
              break;
            }

            return _context2.abrupt('return');

          case 12:
            if (!options.facebook) {
              _context2.next = 18;
              break;
            }

            _context2.next = 15;
            return _socialAuth('facebook');

          case 15:
            return _context2.abrupt('return', _context2.sent);

          case 18:
            if (!options.google) {
              _context2.next = 24;
              break;
            }

            _context2.next = 21;
            return _socialAuth('google');

          case 21:
            return _context2.abrupt('return', _context2.sent);

          case 24:
            if (!options.github) {
              _context2.next = 30;
              break;
            }

            _context2.next = 27;
            return _socialAuth('github');

          case 27:
            return _context2.abrupt('return', _context2.sent);

          case 30:
            if (!options.token) {
              _context2.next = 36;
              break;
            }

            _context2.next = 33;
            return _tokenAuth(options.token);

          case 33:
            return _context2.abrupt('return', _context2.sent);

          case 36:
            _context2.next = 38;
            return _usernamePasswordAuth(options.username, options.password);

          case 38:
            return _context2.abrupt('return', _context2.sent);

          case 39:
            _context2.next = 48;
            break;

          case 41:
            if (!(options.username && options.password)) {
              _context2.next = 47;
              break;
            }

            _context2.next = 44;
            return _usernamePasswordAuth(options.username, options.password);

          case 44:
            return _context2.abrupt('return', _context2.sent);

          case 47:
            throw new (_CommandError || _load_CommandError()).default('NON_INTERACTIVE', 'Username and password not provided in non-interactive mode.');

          case 48:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function login(_x) {
    return _ref3.apply(this, arguments);
  };
}();

var register = exports.register = function () {
  var _ref5 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee3(options) {
    return (_regenerator || _load_regenerator()).default.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            if (!options.github) {
              _context3.next = 6;
              break;
            }

            _context3.next = 3;
            return _socialAuth('github');

          case 3:
            console.log('\nThanks for signing up!');
            _context3.next = 9;
            break;

          case 6:
            _context3.next = 8;
            return _onboardUser();

          case 8:
            console.log('\nThanks for signing up!');

          case 9:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function register(_x2) {
    return _ref5.apply(this, arguments);
  };
}();

var _socialAuth = function () {
  var _ref6 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee4(provider) {
    var user;
    return (_regenerator || _load_regenerator()).default.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return (_xdl || _load_xdl()).User.loginAsync(provider);

          case 2:
            user = _context4.sent;

            if (!user) {
              _context4.next = 16;
              break;
            }

            if (!user.userMetadata.onboarded) {
              _context4.next = 9;
              break;
            }

            console.log('\nSuccess. You are now logged in as ' + (_chalk || _load_chalk()).default.green(user.username) + '.');
            return _context4.abrupt('return', user);

          case 9:
            _context4.next = 11;
            return _onboardUser(user);

          case 11:
            user = _context4.sent;

            console.log('\nSuccess. You are now logged in as ' + (_chalk || _load_chalk()).default.green(user.username) + '.');
            return _context4.abrupt('return', user);

          case 14:
            _context4.next = 17;
            break;

          case 16:
            throw new Error('Unexpected Error: No user returned from the API');

          case 17:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function _socialAuth(_x3) {
    return _ref6.apply(this, arguments);
  };
}();

var _tokenAuth = function () {
  var _ref7 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee5(token) {
    return (_regenerator || _load_regenerator()).default.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            console.log('\nStay tuned! This feature is not yet implemented.');
            return _context5.abrupt('return');

          case 2:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function _tokenAuth(_x4) {
    return _ref7.apply(this, arguments);
  };
}();

var _usernamePasswordAuth = function () {
  var _ref8 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee6(username, password) {
    var questions, answers, data, user;
    return (_regenerator || _load_regenerator()).default.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            questions = [];

            if (!username) {
              questions.push({
                type: 'input',
                name: 'username',
                message: 'Username/Email Address:',
                validate: function validate(val) {
                  if (val.trim() === '') {
                    return false;
                  }
                  return true;
                }
              });
            }

            if (!password) {
              questions.push({
                type: 'password',
                name: 'password',
                message: 'Password:',
                validate: function validate(val) {
                  if (val.trim() === '') {
                    return false;
                  }
                  return true;
                }
              });
            }

            _context6.next = 5;
            return (_inquirer || _load_inquirer()).default.prompt(questions);

          case 5:
            answers = _context6.sent;
            data = {
              username: username || answers.username,
              password: password || answers.password
            };
            _context6.next = 9;
            return (_xdl || _load_xdl()).User.loginAsync('user-pass', data);

          case 9:
            user = _context6.sent;

            if (!user) {
              _context6.next = 23;
              break;
            }

            if (!user.userMetadata.onboarded) {
              _context6.next = 16;
              break;
            }

            console.log('\nSuccess. You are now logged in as ' + (_chalk || _load_chalk()).default.green(user.username) + '.');
            return _context6.abrupt('return', user);

          case 16:
            _context6.next = 18;
            return _onboardUser(user, data);

          case 18:
            user = _context6.sent;

            console.log('\nSuccess. You are now logged in as ' + (_chalk || _load_chalk()).default.green(user.username) + '.');
            return _context6.abrupt('return', user);

          case 21:
            _context6.next = 24;
            break;

          case 23:
            throw new Error('Unexpected Error: No user returned from the API');

          case 24:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, this);
  }));

  return function _usernamePasswordAuth(_x5, _x6) {
    return _ref8.apply(this, arguments);
  };
}();

var _onboardUser = function () {
  var _ref9 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee7(user, usernamePass) {
    var legacyMigration, questions, answers, shouldUpdateUsernamePassword, registeredUser;
    return (_regenerator || _load_regenerator()).default.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            console.log('');

            legacyMigration = user && user.kind === 'legacyUser' || user && user.kind === 'user' && user.currentConnection === 'Username-Password-Authentication';


            if (user && legacyMigration) {
              console.log('Signed in as: @' + (_chalk || _load_chalk()).default.green(user.username) + '\nHi there! We don\'t currently have any way to identify you if you were to lose\nyour password. Please provide us with your name and e-mail address.');
            } else {
              console.log('Thanks for signing up for Expo!\nJust a few questions:');
            }

            console.log('');

            questions = [];

            questions.push({
              type: 'input',
              name: 'givenName',
              message: 'First Name:',
              default: !legacyMigration && user && user.kind === 'user' && user.givenName || null,
              validate: function validate(val) {
                if (val.trim() === '') {
                  return false;
                }
                return true;
              }
            }, {
              type: 'input',
              name: 'familyName',
              message: 'Last Name:',
              default: !legacyMigration && user && user.kind === 'user' && user.familyName || null,
              validate: function validate(val) {
                if (val.trim() === '') {
                  return false;
                }
                return true;
              }
            });

            if (!legacyMigration) {
              // needs a username
              questions.push({
                type: 'input',
                name: 'username',
                message: 'Username:',
                default: user && user.kind === 'user' && (user.username || user.nickname) || null,
                validate: function validate(val, answers) {
                  if (val.trim() === '') {
                    return false;
                  }
                  return true;
                }
              });
            }

            questions.push({
              type: 'input',
              name: 'email',
              message: 'Email Address:',
              default: !legacyMigration && user && user.kind === 'user' && user.email || null,
              validate: function validate(val) {
                if (val.trim() === '') {
                  return false;
                }
                return true;
              }
            });

            if (!legacyMigration || user && user.userMetadata.needsPasswordMigration) {
              questions.push({
                type: 'password',
                name: 'password',
                message: 'Password:',
                validate: function validate(val) {
                  if (val.trim() === '') {
                    return false;
                  }
                  return true;
                }
              });
            }

            if (!legacyMigration) {
              questions.push({
                type: 'password',
                name: 'passwordRepeat',
                message: 'Password Repeat:',
                validate: function validate(val, answers) {
                  if (val.trim() === '') {
                    return false;
                  }
                  if (val.trim() !== answers.password.trim()) {
                    return 'Passwords don\'t match!';
                  }
                  return true;
                }
              });
            }

            _context7.next = 12;
            return (_inquirer || _load_inquirer()).default.prompt(questions);

          case 12:
            answers = _context7.sent;


            // Don't send user data (username/password) if
            shouldUpdateUsernamePassword = !(user && user.kind === 'user' && user.userMetadata.legacy);
            _context7.next = 16;
            return (_xdl || _load_xdl()).User.registerAsync((0, (_extends2 || _load_extends()).default)({}, shouldUpdateUsernamePassword && usernamePass ? usernamePass : {}, answers), user);

          case 16:
            registeredUser = _context7.sent;
            return _context7.abrupt('return', registeredUser);

          case 18:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, this);
  }));

  return function _onboardUser(_x7, _x8) {
    return _ref9.apply(this, arguments);
  };
}();

var _chalk;

function _load_chalk() {
  return _chalk = _interopRequireDefault(require('chalk'));
}

var _inquirer;

function _load_inquirer() {
  return _inquirer = _interopRequireDefault(require('inquirer'));
}

var _xdl;

function _load_xdl() {
  return _xdl = require('xdl');
}

var _CommandError;

function _load_CommandError() {
  return _CommandError = _interopRequireDefault(require('./CommandError'));
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// const EXP_CLIENT_ID = 'Zso9S1J7xpRYzT4QNlanGYLL5aBrqy1l';
(_xdl || _load_xdl()).User.initialize();
//# sourceMappingURL=__sourcemaps__/accounts.js.map
