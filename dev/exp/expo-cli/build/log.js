'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _toConsumableArray2;

function _load_toConsumableArray() {
  return _toConsumableArray2 = _interopRequireDefault(require('babel-runtime/helpers/toConsumableArray'));
}

var _chalk;

function _load_chalk() {
  return _chalk = _interopRequireDefault(require('chalk'));
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _bundleProgressBar = void 0;

var _printNewLineBeforeNextLog = false;
var _isLastLineNewLine = false;
function _updateIsLastLineNewLine(args) {
  if (args.length === 0) {
    _isLastLineNewLine = true;
  } else {
    var lastArg = args[args.length - 1];
    if (typeof lastArg === 'string' && (lastArg === '' || lastArg.match(/[\r\n]$/))) {
      _isLastLineNewLine = true;
    } else {
      _isLastLineNewLine = false;
    }
  }
}

function _maybePrintNewLine() {
  if (_printNewLineBeforeNextLog) {
    _printNewLineBeforeNextLog = false;
    console.log();
  }
}

function consoleLog() {
  var _console;

  _maybePrintNewLine();

  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  _updateIsLastLineNewLine(args);

  (_console = console).log.apply(_console, args);
}

function consoleWarn() {
  var _console2;

  _maybePrintNewLine();

  for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    args[_key2] = arguments[_key2];
  }

  _updateIsLastLineNewLine(args);

  (_console2 = console).warn.apply(_console2, args);
}

function consoleError() {
  var _console3;

  _maybePrintNewLine();

  for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
    args[_key3] = arguments[_key3];
  }

  _updateIsLastLineNewLine(args);

  (_console3 = console).error.apply(_console3, args);
}

function respectProgressBars(commitLogs) {
  if (_bundleProgressBar) {
    _bundleProgressBar.terminate();
    _bundleProgressBar.lastDraw = '';
    commitLogs();
    _bundleProgressBar.render();
  } else {
    commitLogs();
  }
}

function getPrefix(chalkColor) {
  return chalkColor('[') + (_chalk || _load_chalk()).default.gray('exp') + chalkColor(']');
}

function withPrefixAndTextColor(args) {
  var chalkColor = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : (_chalk || _load_chalk()).default.gray;

  return [getPrefix(chalkColor)].concat((0, (_toConsumableArray2 || _load_toConsumableArray()).default)(args.map(function (arg) {
    return chalkColor(arg);
  })));
}

function withPrefix(args) {
  var chalkColor = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : (_chalk || _load_chalk()).default.gray;

  return [getPrefix(chalkColor)].concat((0, (_toConsumableArray2 || _load_toConsumableArray()).default)(args));
}

function log() {
  for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
    args[_key4] = arguments[_key4];
  }

  if (log.config.raw) {
    return;
  }

  respectProgressBars(function () {
    consoleLog.apply(undefined, (0, (_toConsumableArray2 || _load_toConsumableArray()).default)(withPrefix(args)));
  });
}

log.nested = function (message) {
  respectProgressBars(function () {
    consoleLog(message);
  });
};

log.newLine = function newLine() {
  respectProgressBars(function () {
    consoleLog();
  });
};

log.addNewLineIfNone = function addNewLineIfNone() {
  if (!_isLastLineNewLine && !_printNewLineBeforeNextLog) {
    log.newLine();
  }
};

log.printNewLineBeforeNextLog = function printNewLineBeforeNextLog() {
  _printNewLineBeforeNextLog = true;
};

log.setBundleProgressBar = function setBundleProgressBar(bar) {
  _bundleProgressBar = bar;
};

log.error = function error() {
  for (var _len5 = arguments.length, args = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
    args[_key5] = arguments[_key5];
  }

  if (log.config.raw) {
    return;
  }

  respectProgressBars(function () {
    consoleError.apply(undefined, (0, (_toConsumableArray2 || _load_toConsumableArray()).default)(withPrefixAndTextColor(args, (_chalk || _load_chalk()).default.red)));
  });
};

log.nestedError = function (message) {
  respectProgressBars(function () {
    consoleError((_chalk || _load_chalk()).default.red(message));
  });
};

log.warn = function warn() {
  for (var _len6 = arguments.length, args = Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
    args[_key6] = arguments[_key6];
  }

  if (log.config.raw) {
    return;
  }

  respectProgressBars(function () {
    consoleWarn.apply(undefined, (0, (_toConsumableArray2 || _load_toConsumableArray()).default)(withPrefixAndTextColor(args, (_chalk || _load_chalk()).default.yellow)));
  });
};

log.nestedWarn = function (message) {
  respectProgressBars(function () {
    consoleWarn((_chalk || _load_chalk()).default.yellow(message));
  });
};

log.gray = function () {
  for (var _len7 = arguments.length, args = Array(_len7), _key7 = 0; _key7 < _len7; _key7++) {
    args[_key7] = arguments[_key7];
  }

  if (log.config.raw) {
    return;
  }

  respectProgressBars(function () {
    consoleLog.apply(undefined, (0, (_toConsumableArray2 || _load_toConsumableArray()).default)(withPrefixAndTextColor(args)));
  });
};

log.raw = function () {
  for (var _len8 = arguments.length, args = Array(_len8), _key8 = 0; _key8 < _len8; _key8++) {
    args[_key8] = arguments[_key8];
  }

  if (!log.config.raw) {
    return;
  }

  respectProgressBars(function () {
    consoleLog.apply(undefined, args);
  });
};

log.chalk = (_chalk || _load_chalk()).default;

log.config = {
  raw: false
};

exports.default = log;
module.exports = exports['default'];
//# sourceMappingURL=__sourcemaps__/log.js.map
