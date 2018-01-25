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
    var url;
    return (_regenerator || _load_regenerator()).default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return (_urlOpts || _load_urlOpts()).default.optsAsync(projectDir, options);

          case 2:
            _context.next = 4;
            return (_xdl || _load_xdl()).UrlUtils.constructManifestUrlAsync(projectDir);

          case 4:
            url = _context.sent;


            (0, (_log || _load_log()).default)('You can scan this QR code:\n');
            (_urlOpts || _load_urlOpts()).default.printQRCode(url);

            (0, (_log || _load_log()).default)('Your URL is\n\n' + (_chalk || _load_chalk()).default.underline(url) + '\n');
            (_log || _load_log()).default.raw(url);

            _context.next = 11;
            return (_urlOpts || _load_urlOpts()).default.handleMobileOptsAsync(projectDir, options);

          case 11:
            // this is necessary because we have undiagnosed event loop gunk that prevents exit
            process.exit();

          case 12:
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

var _chalk;

function _load_chalk() {
  return _chalk = _interopRequireDefault(require('chalk'));
}

var _xdl;

function _load_xdl() {
  return _xdl = require('xdl');
}

var _log;

function _load_log() {
  return _log = _interopRequireDefault(require('../log'));
}

var _urlOpts;

function _load_urlOpts() {
  return _urlOpts = _interopRequireDefault(require('../urlOpts'));
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (program) {
  program.command('url [project-dir]').alias('u').description('Displays the URL you can use to view your project in Expo').urlOpts().allowOffline().allowNonInteractive().asyncActionProjectDir(action);
};

module.exports = exports['default'];
//# sourceMappingURL=../__sourcemaps__/commands/url.js.map
