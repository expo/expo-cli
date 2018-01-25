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

var askForSendToAsync = function () {
  var _ref = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee() {
    var sendToFromSettings, answers, recipient;
    return (_regenerator || _load_regenerator()).default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return (_xdl || _load_xdl()).UserSettings.getAsync('sendTo', null);

          case 2:
            sendToFromSettings = _context.sent;

            console.log("Enter a mobile number or e-mail and we'll send a link to your phone.");
            _context.next = 6;
            return (_inquirer || _load_inquirer()).default.prompt([{
              type: 'input',
              name: 'sendTo',
              message: 'Your mobile number or e-mail' + (sendToFromSettings ? ' (space to not send anything)' : '') + ':',
              default: sendToFromSettings
            }]);

          case 6:
            answers = _context.sent;
            recipient = answers.sendTo.trim();
            _context.next = 10;
            return (_xdl || _load_xdl()).UserSettings.mergeAsync({ sendTo: recipient });

          case 10:
            return _context.abrupt('return', recipient);

          case 11:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function askForSendToAsync() {
    return _ref.apply(this, arguments);
  };
}();

var _inquirer;

function _load_inquirer() {
  return _inquirer = _interopRequireDefault(require('inquirer'));
}

var _xdl;

function _load_xdl() {
  return _xdl = require('xdl');
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = {
  askForSendToAsync: askForSendToAsync
};


if (require.main === module) {
  askForSendToAsync().then(function (sendTo) {
    console.log('Your mobile number or email is', sendTo);
  });
}
module.exports = exports['default'];
//# sourceMappingURL=__sourcemaps__/askUser.js.map
