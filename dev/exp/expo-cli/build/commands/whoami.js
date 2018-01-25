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

var action = function () {
  var _ref = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee(options) {
    var user;
    return (_regenerator || _load_regenerator()).default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return (_xdl || _load_xdl()).User.ensureLoggedInAsync();

          case 2:
            user = _context.sent;

            if (!(user && user.username)) {
              _context.next = 9;
              break;
            }

            (0, (_log || _load_log()).default)('Logged in as ' + (_chalk || _load_chalk()).default.green(user.username));
            (_log || _load_log()).default.raw(user.username);
            return _context.abrupt('return', user);

          case 9:
            throw new Error("Unexpected Error: Couldn't get user information");

          case 10:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function action(_x) {
    return _ref.apply(this, arguments);
  };
}();

var _xdl;

function _load_xdl() {
  return _xdl = require('xdl');
}

var _log;

function _load_log() {
  return _log = _interopRequireDefault(require('../log'));
}

var _chalk;

function _load_chalk() {
  return _chalk = _interopRequireDefault(require('chalk'));
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (program) {
  program.command('whoami').alias('w').description('Checks with the server and then says who you are logged in as').asyncAction(action);
};

module.exports = exports['default'];
//# sourceMappingURL=../__sourcemaps__/commands/whoami.js.map
