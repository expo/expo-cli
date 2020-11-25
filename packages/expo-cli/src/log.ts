import chalk from 'chalk';
import program from 'commander';
import { boolish } from 'getenv';
import { Ora } from 'ora';
import terminalLink from 'terminal-link';

const EXPO_DEBUG = boolish('EXPO_DEBUG', false);

type Color = (...text: string[]) => string;

let _bundleProgressBar: any;
let _oraSpinner: any;

let _printNewLineBeforeNextLog = false;
let _isLastLineNewLine = false;
function _updateIsLastLineNewLine(args: any[]) {
  if (args.length === 0) {
    _isLastLineNewLine = true;
  } else {
    const lastArg = args[args.length - 1];
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
    console.log(); // eslint-disable-line no-console
  }
}

function consoleDebug(...args: any[]) {
  _maybePrintNewLine();
  _updateIsLastLineNewLine(args);

  console.debug(...args); // eslint-disable-line no-console
}

function consoleInfo(...args: any[]) {
  _maybePrintNewLine();
  _updateIsLastLineNewLine(args);

  console.info(...args); // eslint-disable-line no-console
}

function consoleLog(...args: any[]) {
  _maybePrintNewLine();
  _updateIsLastLineNewLine(args);

  console.log(...args); // eslint-disable-line no-console
}

function consoleWarn(...args: any[]) {
  _maybePrintNewLine();
  _updateIsLastLineNewLine(args);

  console.warn(...args); // eslint-disable-line no-console
}

function consoleError(...args: any[]) {
  _maybePrintNewLine();
  _updateIsLastLineNewLine(args);

  console.error(...args); // eslint-disable-line no-console
}

function respectProgressBars(commitLogs: () => void) {
  if (_bundleProgressBar) {
    _bundleProgressBar.terminate();
    _bundleProgressBar.lastDraw = '';
  }
  if (_oraSpinner) {
    _oraSpinner.stop();
  }
  commitLogs();

  if (_bundleProgressBar) {
    _bundleProgressBar.render();
  }
  if (_oraSpinner) {
    _oraSpinner.start();
  }
}

function getPrefix(chalkColor: Color) {
  return chalkColor(`[${new Date().toTimeString().slice(0, 8)}]`);
}

function withPrefixAndTextColor(args: any[], chalkColor: Color = chalk.gray) {
  if (program.nonInteractive) {
    return [getPrefix(chalkColor), ...args.map(arg => chalkColor(arg))];
  } else {
    return args.map(arg => chalkColor(arg));
  }
}

function withPrefix(args: any[], chalkColor = chalk.gray) {
  if (program.nonInteractive) {
    return [getPrefix(chalkColor), ...args];
  } else {
    return args;
  }
}

function log(...args: any[]) {
  respectProgressBars(() => {
    consoleLog(...withPrefix(args));
  });
}

log.nested = function (message: any) {
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

log.setBundleProgressBar = function setBundleProgressBar(bar: any) {
  _bundleProgressBar = bar;
};

log.setSpinner = function setSpinner(oraSpinner: Ora | null) {
  _oraSpinner = oraSpinner;
  if (_oraSpinner) {
    const originalStart = _oraSpinner.start.bind(_oraSpinner);
    _oraSpinner.start = (text: any) => {
      // Reset the new line tracker
      _isLastLineNewLine = false;
      return originalStart(text);
    };
    // All other methods of stopping will invoke the stop method.
    const originalStop = _oraSpinner.stop.bind(_oraSpinner);
    _oraSpinner.stop = () => {
      // Reset the target spinner
      log.setSpinner(null);
      return originalStop();
    };
  }
};

log.error = function error(...args: any[]) {
  respectProgressBars(() => {
    consoleError(...withPrefixAndTextColor(args, chalk.red));
  });
};

log.nestedError = function (message: string) {
  respectProgressBars(() => {
    consoleError(chalk.red(message));
  });
};

log.warn = function warn(...args: any[]) {
  respectProgressBars(() => {
    consoleWarn(...withPrefixAndTextColor(args, chalk.yellow));
  });
};

log.isDebug = EXPO_DEBUG;

// Only show these logs when EXPO_DEBUG is active
log.debug = function debug(...args: any[]) {
  if (!EXPO_DEBUG) {
    return;
  }
  respectProgressBars(() => {
    consoleDebug(...withPrefixAndTextColor(args));
  });
};

log.info = function info(...args: any[]) {
  if (!EXPO_DEBUG) {
    return;
  }
  respectProgressBars(() => {
    consoleInfo(...args);
  });
};

log.nestedWarn = function (message: string) {
  respectProgressBars(() => {
    consoleWarn(chalk.yellow(message));
  });
};

log.gray = function (...args: any[]) {
  respectProgressBars(() => {
    consoleLog(...withPrefixAndTextColor(args));
  });
};

log.clear = function () {
  process.stdout.write(process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H');
};

log.chalk = chalk;
log.terminalLink = terminalLink;

export default log;
