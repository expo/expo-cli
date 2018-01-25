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
    var projectState, root, startOpts, _ref2, url, isUrlFallback, _ref3, exp, recipient;

    return (_regenerator || _load_regenerator()).default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return (_xdl || _load_xdl()).Project.currentStatus(projectDir);

          case 2:
            projectState = _context.sent;


            if (projectState === 'running') {
              (_log || _load_log()).default.error('exp is already running for this project. Exiting...');
              process.exit(1);
            } else if (projectState === 'ill') {
              (_log || _load_log()).default.warn('exp may have exited improperly. Proceeding, but you should check for orphaned processes.');
            }

            (0, (_exit || _load_exit()).installExitHooks)(projectDir);

            _context.next = 7;
            return (_urlOpts || _load_urlOpts()).default.optsAsync(projectDir, options);

          case 7:

            (0, (_log || _load_log()).default)((_chalk || _load_chalk()).default.gray('Using project at', projectDir));

            root = _path.default.resolve(projectDir);
            startOpts = {};

            if (options.clear) {
              startOpts.reset = true;
            }

            _context.next = 13;
            return (_xdl || _load_xdl()).Project.startAsync(root, startOpts);

          case 13:

            (0, (_log || _load_log()).default)('Expo is ready.');

            _context.next = 16;
            return (_xdl || _load_xdl()).Project.getManifestUrlWithFallbackAsync(projectDir);

          case 16:
            _ref2 = _context.sent;
            url = _ref2.url;
            isUrlFallback = _ref2.isUrlFallback;
            _context.next = 21;
            return (_xdl || _load_xdl()).ProjectUtils.readConfigJsonAsync(projectDir);

          case 21:
            _ref3 = _context.sent;
            exp = _ref3.exp;


            if (!exp.isDetached) {
              (0, (_log || _load_log()).default)('You can scan this QR code:');
              (_log || _load_log()).default.newLine();
              (_urlOpts || _load_urlOpts()).default.printQRCode(url);
            }

            (0, (_log || _load_log()).default)('Your URL is: ' + (_chalk || _load_chalk()).default.underline(url));
            if (isUrlFallback) {
              (_log || _load_log()).default.warn('Switched to a LAN URL because the tunnel appears to be down. ' + 'Only devices in the same network can access the app. ' + 'Restart with `exp start` to try reconnecting.');
            }

            _context.next = 28;
            return (_sendTo || _load_sendTo()).default.getRecipient(options.sendTo);

          case 28:
            recipient = _context.sent;

            if (!recipient) {
              _context.next = 32;
              break;
            }

            _context.next = 32;
            return (_sendTo || _load_sendTo()).default.sendUrlAsync(url, recipient);

          case 32:
            _context.next = 34;
            return (_urlOpts || _load_urlOpts()).default.handleMobileOptsAsync(projectDir, options);

          case 34:

            (0, (_log || _load_log()).default)((_chalk || _load_chalk()).default.green('Logs for your project will appear below. Press Ctrl+C to exit.'));

          case 35:
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

var _chalk;

function _load_chalk() {
  return _chalk = _interopRequireDefault(require('chalk'));
}

var _path = _interopRequireDefault(require('path'));

var _log;

function _load_log() {
  return _log = _interopRequireDefault(require('../log'));
}

var _sendTo;

function _load_sendTo() {
  return _sendTo = _interopRequireDefault(require('../sendTo'));
}

var _exit;

function _load_exit() {
  return _exit = require('../exit');
}

var _urlOpts;

function _load_urlOpts() {
  return _urlOpts = _interopRequireDefault(require('../urlOpts'));
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (program) {
  program.command('start [project-dir]').alias('r').description('Starts or restarts a local server for your app and gives you a URL to it').option('-s, --send-to [dest]', 'A phone number or e-mail address to send a link to').option('-c, --clear', 'Clear the React Native packager cache').urlOpts().allowNonInteractive().allowOffline().asyncActionProjectDir(action, true);
};

module.exports = exports['default'];
//# sourceMappingURL=../__sourcemaps__/commands/start.js.map
