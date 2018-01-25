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

var optsAsync = function () {
  var _ref = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee(projectDir, options) {
    var opts, rawArgs;
    return (_regenerator || _load_regenerator()).default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return (_xdl || _load_xdl()).ProjectSettings.readAsync(projectDir);

          case 2:
            opts = _context.sent;

            if (!(!!options.host + !!options.lan + !!options.localhost + !!options.tunnel > 1)) {
              _context.next = 5;
              break;
            }

            throw (0, (_CommandError || _load_CommandError()).default)('BAD_ARGS', 'Specify at most one of --host, --tunnel, --lan, and --localhost');

          case 5:

            if (options.host) {
              opts.hostType = options.host;
            }
            if (options.tunnel) {
              opts.hostType = 'tunnel';
            }
            if (options.lan) {
              opts.hostType = 'lan';
            }
            if (options.localhost) {
              opts.hostType = 'localhost';
            }

            rawArgs = options.parent.rawArgs;

            if (hasBooleanArg(rawArgs, 'dev')) {
              opts.dev = getBooleanArg(rawArgs, 'dev');
            }
            if (hasBooleanArg(rawArgs, 'minify')) {
              opts.minify = getBooleanArg(rawArgs, 'minify');
            }

            _context.next = 14;
            return (_xdl || _load_xdl()).ProjectSettings.setAsync(projectDir, opts);

          case 14:
            return _context.abrupt('return', opts);

          case 15:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function optsAsync(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();

var handleMobileOptsAsync = function () {
  var _ref2 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee2(projectDir, options) {
    return (_regenerator || _load_regenerator()).default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            if (!options.android) {
              _context2.next = 3;
              break;
            }

            _context2.next = 3;
            return (_xdl || _load_xdl()).Android.openProjectAsync(projectDir);

          case 3:
            if (!options.ios) {
              _context2.next = 6;
              break;
            }

            _context2.next = 6;
            return (_xdl || _load_xdl()).Simulator.openProjectAsync(projectDir);

          case 6:
            return _context2.abrupt('return', !!options.android || !!options.ios);

          case 7:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function handleMobileOptsAsync(_x3, _x4) {
    return _ref2.apply(this, arguments);
  };
}();

var _indentString;

function _load_indentString() {
  return _indentString = _interopRequireDefault(require('indent-string'));
}

var _lodash;

function _load_lodash() {
  return _lodash = _interopRequireDefault(require('lodash'));
}

var _qrcodeTerminal;

function _load_qrcodeTerminal() {
  return _qrcodeTerminal = _interopRequireDefault(require('qrcode-terminal'));
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

function addOptions(program) {
  program.option('-a, --android', 'Opens your app in Expo on a connected Android device').option('-i, --ios', 'Opens your app in Expo in a currently running iOS simulator on your computer').option('-m, --host [mode]', 'tunnel (default), lan, localhost. Type of host to use. "tunnel" allows you to view your link on other networks').option('--tunnel', 'Same as --host tunnel').option('--lan', 'Same as --host lan').option('--localhost', 'Same as --host localhost').option('--dev', 'Turns dev flag on').option('--no-dev', 'Turns dev flag off').option('--minify', 'Turns minify flag on').option('--no-minify', 'Turns minify flag off');
}

function hasBooleanArg(rawArgs, argName) {
  return (_lodash || _load_lodash()).default.includes(rawArgs, '--' + argName) || (_lodash || _load_lodash()).default.includes(rawArgs, '--no-' + argName);
}

function getBooleanArg(rawArgs, argName) {
  if ((_lodash || _load_lodash()).default.includes(rawArgs, '--' + argName)) {
    return true;
  } else {
    return false;
  }
}

function printQRCode(url) {
  (_qrcodeTerminal || _load_qrcodeTerminal()).default.generate(url, function (code) {
    return console.log((0, (_indentString || _load_indentString()).default)(code, 2) + '\n');
  });
}

exports.default = {
  addOptions: addOptions,
  handleMobileOptsAsync: handleMobileOptsAsync,
  printQRCode: printQRCode,
  optsAsync: optsAsync
};
module.exports = exports['default'];
//# sourceMappingURL=__sourcemaps__/urlOpts.js.map
