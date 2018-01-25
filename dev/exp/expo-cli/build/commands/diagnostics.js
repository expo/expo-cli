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
    var _ref2, url;

    return (_regenerator || _load_regenerator()).default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            (0, (_log || _load_log()).default)('Generating diagnostics report...');
            (0, (_log || _load_log()).default)('You can join our slack here: https://slack.expo.io/.');

            (_simpleSpinner || _load_simpleSpinner()).default.start();
            _context.next = 5;
            return (_xdl || _load_xdl()).Diagnostics.getDeviceInfoAsync({
              uploadLogs: true
            });

          case 5:
            _ref2 = _context.sent;
            url = _ref2.url;

            (_simpleSpinner || _load_simpleSpinner()).default.stop();

            (0, (_envinfo || _load_envinfo()).print)();

            console.log('\x1B[4mDiagnostics report:\x1B[0m\n  ' + url + '\n');
            (_log || _load_log()).default.raw(url);

          case 11:
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

var _envinfo;

function _load_envinfo() {
  return _envinfo = require('envinfo');
}

var _simpleSpinner;

function _load_simpleSpinner() {
  return _simpleSpinner = _interopRequireDefault(require('@expo/simple-spinner'));
}

var _log;

function _load_log() {
  return _log = _interopRequireDefault(require('../log'));
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (program) {
  program.command('diagnostics [project-dir]').description('Uploads diagnostics information and returns a url to share with the Expo team.').asyncAction(action);
};

module.exports = exports['default'];
//# sourceMappingURL=../__sourcemaps__/commands/diagnostics.js.map
