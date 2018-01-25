'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.action = undefined;

var _regenerator;

function _load_regenerator() {
  return _regenerator = _interopRequireDefault(require('babel-runtime/regenerator'));
}

var _asyncToGenerator2;

function _load_asyncToGenerator() {
  return _asyncToGenerator2 = _interopRequireDefault(require('babel-runtime/helpers/asyncToGenerator'));
}

var action = exports.action = function () {
  var _ref = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee(projectDir) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var channelRe, status, startedOurOwn, recipient, result, url;
    return (_regenerator || _load_regenerator()).default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            channelRe = new RegExp(/^[a-z\d][a-z\d._-]*$/);

            if (options.releaseChannel && !channelRe.test(options.releaseChannel)) {
              (_log || _load_log()).default.error('Release channel name can only contain lowercase letters, numbers and special characters . _ and -');
              process.exit(1);
            }
            _context.next = 4;
            return (_xdl || _load_xdl()).Project.currentStatus(projectDir);

          case 4:
            status = _context.sent;
            startedOurOwn = false;

            if (!(status !== 'running')) {
              _context.next = 12;
              break;
            }

            (0, (_log || _load_log()).default)('Unable to find an existing exp instance for this directory, starting a new one...');
            (0, (_exit || _load_exit()).installExitHooks)(projectDir);
            _context.next = 11;
            return (_xdl || _load_xdl()).Project.startAsync(projectDir, { reset: options.clear, nonPersistent: true }, !options.quiet);

          case 11:
            startedOurOwn = true;

          case 12:
            _context.next = 14;
            return (_sendTo || _load_sendTo()).default.getRecipient(options.sendTo);

          case 14:
            recipient = _context.sent;

            (0, (_log || _load_log()).default)('Publishing...');

            if (options.quiet) {
              (_simpleSpinner || _load_simpleSpinner()).default.start();
            }

            _context.next = 19;
            return (_xdl || _load_xdl()).Project.publishAsync(projectDir, {
              releaseChannel: options.releaseChannel
            });

          case 19:
            result = _context.sent;
            url = result.url;

            // Append the query param for the release channel to the URL.
            // When we integrate release channels into XDE, we can revisit this and
            // perhaps push the logic for this into xdl

            if (options.releaseChannel && options.releaseChannel !== 'default') {
              url = url + '?release-channel=' + options.releaseChannel;
            }

            if (options.quiet) {
              (_simpleSpinner || _load_simpleSpinner()).default.stop();
            }

            (0, (_log || _load_log()).default)('Published');
            (0, (_log || _load_log()).default)('Your URL is\n\n' + (_chalk || _load_chalk()).default.underline(url) + '\n');
            (_log || _load_log()).default.raw(url);

            if (!recipient) {
              _context.next = 29;
              break;
            }

            _context.next = 29;
            return (_sendTo || _load_sendTo()).default.sendUrlAsync(url, recipient);

          case 29:
            if (!startedOurOwn) {
              _context.next = 32;
              break;
            }

            _context.next = 32;
            return (_xdl || _load_xdl()).Project.stopAsync(projectDir);

          case 32:
            return _context.abrupt('return', result);

          case 33:
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

var _chalk;

function _load_chalk() {
  return _chalk = _interopRequireDefault(require('chalk'));
}

var _simpleSpinner;

function _load_simpleSpinner() {
  return _simpleSpinner = _interopRequireDefault(require('@expo/simple-spinner'));
}

var _xdl;

function _load_xdl() {
  return _xdl = require('xdl');
}

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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (program) {
  program.command('publish [project-dir]').alias('p').description('Publishes your project to exp.host').option('-q, --quiet', 'Suppress verbose output from the React Native packager.').option('-s, --send-to [dest]', 'A phone number or e-mail address to send a link to').option('-c, --clear', 'Clear the React Native packager cache').option('-c --release-channel <release channel>', "The release channel to publish to. Default is 'default'.", 'default').allowNonInteractive().asyncActionProjectDir(action, true);
};
//# sourceMappingURL=../__sourcemaps__/commands/publish.js.map
