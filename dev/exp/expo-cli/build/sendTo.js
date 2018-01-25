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

var getRecipient = function () {
  var _ref = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee(sendTo) {
    var recipient;
    return (_regenerator || _load_regenerator()).default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            recipient = void 0;

            if (!sendTo) {
              _context.next = 13;
              break;
            }

            if (!(typeof sendTo !== 'boolean')) {
              _context.next = 6;
              break;
            }

            recipient = sendTo;
            _context.next = 9;
            break;

          case 6:
            _context.next = 8;
            return (_xdl || _load_xdl()).UserSettings.getAsync('sendTo', null);

          case 8:
            recipient = _context.sent;

          case 9:
            if (recipient) {
              _context.next = 13;
              break;
            }

            _context.next = 12;
            return (_askUser || _load_askUser()).default.askForSendToAsync();

          case 12:
            recipient = _context.sent;

          case 13:
            return _context.abrupt('return', recipient);

          case 14:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function getRecipient(_x) {
    return _ref.apply(this, arguments);
  };
}();

var sendUrlAsync = function () {
  var _ref2 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee2(url, recipient) {
    var result;
    return (_regenerator || _load_regenerator()).default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            (0, (_log || _load_log()).default)('Sending URL to', recipient);
            (_simpleSpinner || _load_simpleSpinner()).default.start();
            _context2.prev = 2;
            _context2.next = 5;
            return (_xdl || _load_xdl()).Exp.sendAsync(recipient, url);

          case 5:
            result = _context2.sent;

          case 6:
            _context2.prev = 6;

            (_simpleSpinner || _load_simpleSpinner()).default.stop();
            return _context2.finish(6);

          case 9:
            (0, (_log || _load_log()).default)('Sent.');
            return _context2.abrupt('return', result);

          case 11:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this, [[2,, 6, 9]]);
  }));

  return function sendUrlAsync(_x2, _x3) {
    return _ref2.apply(this, arguments);
  };
}();

var _simpleSpinner;

function _load_simpleSpinner() {
  return _simpleSpinner = _interopRequireDefault(require('@expo/simple-spinner'));
}

var _xdl;

function _load_xdl() {
  return _xdl = require('xdl');
}

var _askUser;

function _load_askUser() {
  return _askUser = _interopRequireDefault(require('./askUser'));
}

var _log;

function _load_log() {
  return _log = _interopRequireDefault(require('./log'));
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = {
  getRecipient: getRecipient,
  sendUrlAsync: sendUrlAsync
};
module.exports = exports['default'];
//# sourceMappingURL=__sourcemaps__/sendTo.js.map
