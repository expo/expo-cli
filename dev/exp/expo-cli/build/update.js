'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _regenerator;

function _load_regenerator() {
  return _regenerator = _interopRequireDefault(require('babel-runtime/regenerator'));
}

var _slicedToArray2;

function _load_slicedToArray() {
  return _slicedToArray2 = _interopRequireDefault(require('babel-runtime/helpers/slicedToArray'));
}

var _asyncToGenerator2;

function _load_asyncToGenerator() {
  return _asyncToGenerator2 = _interopRequireDefault(require('babel-runtime/helpers/asyncToGenerator'));
}

var currentExpVersionAsync = function () {
  var _ref4 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee2() {
    return (_regenerator || _load_regenerator()).default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            return _context2.abrupt('return', new (_jsonFile || _load_jsonFile()).default(_path.default.join(__dirname, '..', 'package.json')).getAsync('version'));

          case 1:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function currentExpVersionAsync() {
    return _ref4.apply(this, arguments);
  };
}();

var checkForExpUpdateAsync = function () {
  var _ref5 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee3() {
    var current, _ref6, latest, state;

    return (_regenerator || _load_regenerator()).default.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return currentExpVersionAsync();

          case 2:
            current = _context3.sent;
            _context3.next = 5;
            return UpdateCacher.getAsync();

          case 5:
            _ref6 = _context3.sent;
            latest = _ref6.latestVersionExp;
            state = void 0;
            _context3.t0 = (_semver || _load_semver()).default.compare(current, latest);
            _context3.next = _context3.t0 === -1 ? 11 : _context3.t0 === 0 ? 13 : _context3.t0 === 1 ? 15 : 17;
            break;

          case 11:
            state = 'out-of-date';
            return _context3.abrupt('break', 18);

          case 13:
            state = 'up-to-date';
            return _context3.abrupt('break', 18);

          case 15:
            state = 'ahead-of-published';
            return _context3.abrupt('break', 18);

          case 17:
            throw new Error('Confused about whether exp is up-to-date or not');

          case 18:
            return _context3.abrupt('return', {
              state: state,
              current: current,
              latest: latest
            });

          case 19:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function checkForExpUpdateAsync() {
    return _ref5.apply(this, arguments);
  };
}();

var _child_process;

function _load_child_process() {
  return _child_process = _interopRequireDefault(require('mz/child_process'));
}

var _jsonFile;

function _load_jsonFile() {
  return _jsonFile = _interopRequireDefault(require('@expo/json-file'));
}

var _path = _interopRequireDefault(require('path'));

var _semver;

function _load_semver() {
  return _semver = _interopRequireDefault(require('semver'));
}

var _xdl;

function _load_xdl() {
  return _xdl = require('xdl');
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var UpdateCacher = new (_xdl || _load_xdl()).FsCache.Cacher((0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee() {
  var packageName, _ref2, _ref3, version_, _, trimmed;

  return (_regenerator || _load_regenerator()).default.wrap(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.next = 2;
          return new (_jsonFile || _load_jsonFile()).default(_path.default.join(__dirname, '..', 'package.json')).getAsync('name');

        case 2:
          packageName = _context.sent;
          _context.next = 5;
          return (_child_process || _load_child_process()).default.exec('npm view ' + packageName + ' version');

        case 5:
          _ref2 = _context.sent;
          _ref3 = (0, (_slicedToArray2 || _load_slicedToArray()).default)(_ref2, 2);
          version_ = _ref3[0];
          _ = _ref3[1];
          trimmed = version_.trim();
          return _context.abrupt('return', {
            latestVersionExp: trimmed
          });

        case 11:
        case 'end':
          return _context.stop();
      }
    }
  }, _callee, undefined);
})), 'exp-updates.json', 24 * 60 * 60 * 1000 // one day
);

exports.default = {
  currentExpVersionAsync: currentExpVersionAsync,
  checkForExpUpdateAsync: checkForExpUpdateAsync
};
module.exports = exports['default'];
//# sourceMappingURL=__sourcemaps__/update.js.map
