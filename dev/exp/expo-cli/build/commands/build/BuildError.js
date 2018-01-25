'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _getPrototypeOf;

function _load_getPrototypeOf() {
  return _getPrototypeOf = _interopRequireDefault(require('babel-runtime/core-js/object/get-prototype-of'));
}

var _classCallCheck2;

function _load_classCallCheck() {
  return _classCallCheck2 = _interopRequireDefault(require('babel-runtime/helpers/classCallCheck'));
}

var _possibleConstructorReturn2;

function _load_possibleConstructorReturn() {
  return _possibleConstructorReturn2 = _interopRequireDefault(require('babel-runtime/helpers/possibleConstructorReturn'));
}

var _inherits2;

function _load_inherits() {
  return _inherits2 = _interopRequireDefault(require('babel-runtime/helpers/inherits'));
}

var _es6Error;

function _load_es6Error() {
  return _es6Error = _interopRequireDefault(require('es6-error'));
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var BuildError = function (_ExtendableError) {
  (0, (_inherits2 || _load_inherits()).default)(BuildError, _ExtendableError);

  function BuildError(message) {
    (0, (_classCallCheck2 || _load_classCallCheck()).default)(this, BuildError);

    var _this = (0, (_possibleConstructorReturn2 || _load_possibleConstructorReturn()).default)(this, (BuildError.__proto__ || (0, (_getPrototypeOf || _load_getPrototypeOf()).default)(BuildError)).call(this));

    _this.name = 'BuildError';
    _this.message = message;
    return _this;
  }

  return BuildError;
}((_es6Error || _load_es6Error()).default);

exports.default = BuildError;
module.exports = exports['default'];
//# sourceMappingURL=../../__sourcemaps__/commands/build/BuildError.js.map
