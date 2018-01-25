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
    var _ref2, schemaErrorMessage, assetsErrorMessage;

    return (_regenerator || _load_regenerator()).default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.prev = 0;

            if (!options.schema) {
              _context.next = 10;
              break;
            }

            _context.next = 4;
            return (_xdl || _load_xdl()).Doctor.validateWithSchemaFileAsync(projectDir, options.schema);

          case 4:
            _ref2 = _context.sent;
            schemaErrorMessage = _ref2.schemaErrorMessage;
            assetsErrorMessage = _ref2.assetsErrorMessage;

            if (schemaErrorMessage) {
              (0, (_log || _load_log()).default)(schemaErrorMessage);
            } else if (assetsErrorMessage) {
              (0, (_log || _load_log()).default)(assetsErrorMessage);
            } else {
              (0, (_log || _load_log()).default)('Schema and app.json are valid');
            }
            _context.next = 11;
            break;

          case 10:
            (0, (_log || _load_log()).default)('No option provided');

          case 11:
            _context.next = 16;
            break;

          case 13:
            _context.prev = 13;
            _context.t0 = _context['catch'](0);

            (0, (_log || _load_log()).default)(_context.t0);

          case 16:
            process.exit();

          case 17:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this, [[0, 13]]);
  }));

  return function action(_x, _x2) {
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
  program.command('test-schema [project-dir]', null, { noHelp: true }).option('-s, --schema [path]', 'Validate the current directory against the given schema').allowNonInteractive().asyncActionProjectDir(action, true /* skip project validation */);
};

module.exports = exports['default'];
//# sourceMappingURL=../__sourcemaps__/commands/test-schema.js.map
