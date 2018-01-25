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

var _xdl;

function _load_xdl() {
  return _xdl = require('xdl');
}

var _log;

function _load_log() {
  return _log = _interopRequireDefault(require('../log'));
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (program) {
  program.command('install:ios').description('Install the latest version of Expo Client for iOS on the simulator').asyncAction((0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee() {
    return (_regenerator || _load_regenerator()).default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return (_xdl || _load_xdl()).Simulator.upgradeExpoAsync();

          case 2:
            if (!_context.sent) {
              _context.next = 4;
              break;
            }

            (0, (_log || _load_log()).default)('Done!');

          case 4:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, undefined);
  })), true);

  program.command('install:android').description('Install the latest version of Expo Client for Android on a connected device or emulator').asyncAction((0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee2() {
    return (_regenerator || _load_regenerator()).default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return (_xdl || _load_xdl()).Android.upgradeExpoAsync();

          case 2:
            if (!_context2.sent) {
              _context2.next = 4;
              break;
            }

            (0, (_log || _load_log()).default)('Done!');

          case 4:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, undefined);
  })), true);
};

module.exports = exports['default'];
//# sourceMappingURL=../__sourcemaps__/commands/install.js.map
