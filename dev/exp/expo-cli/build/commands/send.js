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
    var url, shouldQuit, recipient;
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

            shouldQuit = false;
            _context.next = 12;
            return (_urlOpts || _load_urlOpts()).default.handleMobileOptsAsync(projectDir, options);

          case 12:
            if (!_context.sent) {
              _context.next = 14;
              break;
            }

            shouldQuit = true;

          case 14:
            if (!shouldQuit) {
              _context.next = 16;
              break;
            }

            return _context.abrupt('return');

          case 16:
            if (!(typeof options.sendTo !== 'boolean')) {
              _context.next = 20;
              break;
            }

            recipient = options.sendTo;
            _context.next = 23;
            break;

          case 20:
            _context.next = 22;
            return (_xdl || _load_xdl()).UserSettings.getAsync('sendTo', null);

          case 22:
            recipient = _context.sent;

          case 23:
            if (recipient) {
              _context.next = 27;
              break;
            }

            _context.next = 26;
            return (_askUser || _load_askUser()).default.askForSendToAsync();

          case 26:
            recipient = _context.sent;

          case 27:
            if (!recipient) {
              _context.next = 32;
              break;
            }

            _context.next = 30;
            return (_sendTo || _load_sendTo()).default.sendUrlAsync(url, recipient);

          case 30:
            _context.next = 33;
            break;

          case 32:
            (_log || _load_log()).default.gray("(Not sending anything because you didn't specify a recipient.)");

          case 33:

            process.exit();

          case 34:
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

var _askUser;

function _load_askUser() {
  return _askUser = _interopRequireDefault(require('../askUser'));
}

var _log;

function _load_log() {
  return _log = _interopRequireDefault(require('../log'));
}

var _sendTo;

function _load_sendTo() {
  return _sendTo = _interopRequireDefault(require('../sendTo'));
}

var _urlOpts;

function _load_urlOpts() {
  return _urlOpts = _interopRequireDefault(require('../urlOpts'));
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (program) {
  program.command('send [project-dir]').description('Sends a link to your project to a phone number or e-mail address')
  //.help('You must have the server running for this command to work')
  .option('-s, --send-to  [dest]', 'Specifies the mobile number or e-mail address to send this URL to').urlOpts().allowNonInteractive().asyncActionProjectDir(action);
};

module.exports = exports['default'];
//# sourceMappingURL=../__sourcemaps__/commands/send.js.map
