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
  var _ref = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee(projectDir, options) {
    return (_regenerator || _load_regenerator()).default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return (_xdl || _load_xdl()).Project.setOptionsAsync(projectDir, {
              packagerPort: parseInt(options.port, 10)
            });

          case 2:
            _context.next = 4;
            return (_xdl || _load_xdl()).Project.startExpoServerAsync(projectDir);

          case 4:
            _context.next = 6;
            return (_xdl || _load_xdl()).Project.startTunnelsAsync(projectDir);

          case 6:
            _context.next = 8;
            return (0, (_delayAsync || _load_delayAsync()).default)(1000 * 60 * 60);

          case 8:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function action(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();

var _xdl;

function _load_xdl() {
  return _xdl = require('xdl');
}

var _delayAsync;

function _load_delayAsync() {
  return _delayAsync = _interopRequireDefault(require('delay-async'));
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (program) {
  program.command('vscode [project-dir]').description('Runs Expo on top of an existing packager. Run `react-native start` before calling this command.').option('-p, --port [number]', 'Port of existing packager').allowNonInteractive().asyncActionProjectDir(action);
};

module.exports = exports['default'];
//# sourceMappingURL=../__sourcemaps__/debug_commands/vscode.js.map
