import chalk from 'chalk';

let _bundleProgressBar;

let _printNewLineBeforeNextLog = false;
let _isLastLineNewLine = false;
function _updateIsLastLineNewLine(args) {
  if (args.length === 0) {
    _isLastLineNewLine = true;
  } else {
    let lastArg = args[args.length - 1];
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

function consoleLog(...args) {
  _maybePrintNewLine();
  _updateIsLastLineNewLine(args);

  console.log(...args);
}

function consoleWarn(...args) {
  _maybePrintNewLine();
  _updateIsLastLineNewLine(args);

  console.warn(...args);
}

function consoleError(...args) {
  _maybePrintNewLine();
  _updateIsLastLineNewLine(args);

  console.error(...args);
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
  return (
    chalkColor(new Date().toTimeString().slice(0, 8)) +
    ' ' +
    chalkColor('[') +
    chalk.gray('exp') +
    chalkColor(']')
  );
}

function withPrefixAndTextColor(args, chalkColor = chalk.gray) {
  return [getPrefix(chalkColor), ...args.map(arg => chalkColor(arg))];
}

function withPrefix(args, chalkColor = chalk.gray) {
  return [getPrefix(chalkColor), ...args];
}

function log(...args) {
  if (log.config.raw) {
    return;
  }

  respectProgressBars(() => {
    consoleLog(...withPrefix(args));
  });
}

log.nested = function(message) {
  respectProgressBars(() => {
    consoleLog(message);
  });
};

log.newLine = function newLine() {
  respectProgressBars(() => {
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

log.error = function error(...args) {
  if (log.config.raw) {
    return;
  }

  respectProgressBars(() => {
    consoleError(...withPrefixAndTextColor(args, chalk.red));
  });
};

log.nestedError = function(message) {
  respectProgressBars(() => {
    consoleError(chalk.red(message));
  });
};

log.warn = function warn(...args) {
  if (log.config.raw) {
    return;
  }

  respectProgressBars(() => {
    consoleWarn(...withPrefixAndTextColor(args, chalk.yellow));
  });
};

log.nestedWarn = function(message) {
  respectProgressBars(() => {
    consoleWarn(chalk.yellow(message));
  });
};

log.gray = function(...args) {
  if (log.config.raw) {
    return;
  }

  respectProgressBars(() => {
    consoleLog(...withPrefixAndTextColor(args));
  });
};

log.raw = function(...args) {
  if (!log.config.raw) {
    return;
  }

  respectProgressBars(() => {
    consoleLog(...args);
  });
};

log.chalk = chalk;

log.config = {
  raw: false,
};

export default log;
