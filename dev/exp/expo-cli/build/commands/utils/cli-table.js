'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stringify;

function _load_stringify() {
  return _stringify = _interopRequireDefault(require('babel-runtime/core-js/json/stringify'));
}

var _typeof2;

function _load_typeof() {
  return _typeof2 = _interopRequireDefault(require('babel-runtime/helpers/typeof'));
}

var _slicedToArray2;

function _load_slicedToArray() {
  return _slicedToArray2 = _interopRequireDefault(require('babel-runtime/helpers/slicedToArray'));
}

var _entries;

function _load_entries() {
  return _entries = _interopRequireDefault(require('babel-runtime/core-js/object/entries'));
}

var _defineProperty2;

function _load_defineProperty() {
  return _defineProperty2 = _interopRequireDefault(require('babel-runtime/helpers/defineProperty'));
}

exports.printTableJsonArray = printTableJsonArray;
exports.printTableJson = printTableJson;

var _cliTable;

function _load_cliTable() {
  return _cliTable = _interopRequireDefault(require('cli-table'));
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function printTableJsonArray(headers, jsonArray, colWidths) {
  var table = new (_cliTable || _load_cliTable()).default({
    head: headers,
    colWidths: colWidths
  });

  jsonArray.forEach(function (json) {
    table.push(headers.map(function (header) {
      return json[header] ? json[header] : '';
    }));
  });

  return table.toString();
}

var VERTICAL_CELL_WIDTH = 80;
function printTableJson(json, header1, header2) {
  var table = new (_cliTable || _load_cliTable()).default();
  if (header1 || header2) {
    header1 = header1 ? header1 : '';
    header2 = header2 ? header2 : '';
    table.push((0, (_defineProperty2 || _load_defineProperty()).default)({}, header1, header2));
  }
  (0, (_entries || _load_entries()).default)(json).forEach(function (_ref) {
    var _ref2 = (0, (_slicedToArray2 || _load_slicedToArray()).default)(_ref, 2),
        key = _ref2[0],
        value = _ref2[1];

    // check if value is a JSON
    if ((typeof value === 'undefined' ? 'undefined' : (0, (_typeof2 || _load_typeof()).default)(value)) === 'object') {
      value = (0, (_stringify || _load_stringify()).default)(value);
    } else {
      value = String(value);
    }
    // Add newline every 80 chars
    key = key.replace(new RegExp('(.{' + VERTICAL_CELL_WIDTH + '})', 'g'), '$1\n');
    value = value.replace(new RegExp('(.{' + VERTICAL_CELL_WIDTH + '})', 'g'), '$1\n');
    table.push((0, (_defineProperty2 || _load_defineProperty()).default)({}, key, value));
  });

  return table.toString();
}
//# sourceMappingURL=../../__sourcemaps__/commands/utils/cli-table.js.map
