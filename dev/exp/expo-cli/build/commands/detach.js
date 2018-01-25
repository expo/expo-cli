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

// Set EXPO_VIEW_DIR to universe/exponent to pull expo view code locally instead of from S3
var action = function () {
  var _ref = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee(projectDir, options) {
    return (_regenerator || _load_regenerator()).default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return (_xdl || _load_xdl()).Detach.detachAsync(projectDir, options);

          case 2:
            // yesno lib doesn't properly shut down. without this the command won't exit
            process.stdin.pause();

          case 3:
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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (program) {
  program.command('detach [project-dir]').description('Creates Xcode and Android Studio projects for your app. Use this if you need to add custom native functionality.').option('-f --force', 'Will attempt to generate an iOS project even when the system is not running macOS. Unsafe and may fail.').allowNonInteractive().asyncActionProjectDir(action);
};

module.exports = exports['default'];
//# sourceMappingURL=../__sourcemaps__/commands/detach.js.map
