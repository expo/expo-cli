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
  var _ref = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee(projectDir) {
    return (_regenerator || _load_regenerator()).default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return (_xdl || _load_xdl()).Doctor.validateWithNetworkAsync(projectDir);

          case 2:
            _context.t0 = _context.sent;
            _context.t1 = (_xdl || _load_xdl()).Doctor.NO_ISSUES;

            if (!(_context.t0 === _context.t1)) {
              _context.next = 6;
              break;
            }

            (0, (_log || _load_log()).default)('Didn\'t find any issues with your project!');

          case 6:
            process.exit();

          case 7:
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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (program) {
  program.command('doctor [project-dir]').description('Diagnoses issues with your Expo project.').allowNonInteractive().asyncActionProjectDir(action, true);
};

module.exports = exports['default'];
//# sourceMappingURL=../__sourcemaps__/commands/doctor.js.map
