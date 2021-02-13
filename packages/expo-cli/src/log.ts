import chalk from 'chalk';
import program from 'commander';
import { boolish } from 'getenv';
import { Ora } from 'ora';
import terminalLink from 'terminal-link';

type Color = (...text: string[]) => string;

const isProfiling = boolish('EXPO_PROFILE', false);

// eslint-disable-next-line no-console
const consoleTime: (label?: string) => void = isProfiling ? console.time : () => {};
// eslint-disable-next-line no-console
const consoleTimeEnd: (label?: string) => void = isProfiling ? console.timeEnd : () => {};

export default class Log {
  public static readonly chalk = chalk;
  public static readonly terminalLink = terminalLink;
  public static readonly isDebug = boolish('EXPO_DEBUG', false);
  public static readonly isProfiling = isProfiling;

  public static log(...args: any[]) {
    Log.respectProgressBars(() => {
      Log.consoleLog(...Log.withPrefix(args));
    });
  }

  public static nested(message: any) {
    Log.respectProgressBars(() => {
      Log.consoleLog(message);
    });
  }

  public static time = consoleTime;

  public static timeEnd = consoleTimeEnd;

  public static newLine() {
    Log.respectProgressBars(() => {
      Log.consoleLog();
    });
  }

  public static addNewLineIfNone() {
    if (!Log._isLastLineNewLine && !Log._printNewLineBeforeNextLog) {
      Log.newLine();
    }
  }

  public static printNewLineBeforeNextLog() {
    Log._printNewLineBeforeNextLog = true;
  }

  public static setBundleProgressBar(bar: any) {
    Log._bundleProgressBar = bar;
  }

  public static setSpinner(oraSpinner: Ora | null) {
    Log._oraSpinner = oraSpinner;
    if (Log._oraSpinner) {
      const originalStart = Log._oraSpinner.start.bind(Log._oraSpinner);
      Log._oraSpinner.start = (text: any) => {
        // Reset the new line tracker
        Log._isLastLineNewLine = false;
        return originalStart(text);
      };
      // All other methods of stopping will invoke the stop method.
      const originalStop = Log._oraSpinner.stop.bind(Log._oraSpinner);
      Log._oraSpinner.stop = () => {
        // Reset the target spinner
        Log.setSpinner(null);
        return originalStop();
      };
    }
  }

  public static error(...args: any[]) {
    Log.respectProgressBars(() => {
      Log.consoleError(...Log.withPrefixAndTextColor(args, chalk.red));
    });
  }

  public static nestedError(message: string) {
    Log.respectProgressBars(() => {
      Log.consoleError(chalk.red(message));
    });
  }

  public static warn(...args: any[]) {
    Log.respectProgressBars(() => {
      Log.consoleWarn(...Log.withPrefixAndTextColor(args, chalk.yellow));
    });
  }

  // Only show these logs when EXPO_DEBUG is active
  public static debug(...args: any[]) {
    if (!Log.isDebug) {
      return;
    }
    Log.respectProgressBars(() => {
      Log.consoleDebug(...Log.withPrefixAndTextColor(args));
    });
  }

  public static info(...args: any[]) {
    if (!Log.isDebug) {
      return;
    }
    Log.respectProgressBars(() => {
      Log.consoleInfo(...args);
    });
  }

  public static nestedWarn(message: string) {
    Log.respectProgressBars(() => {
      Log.consoleWarn(chalk.yellow(message));
    });
  }

  public static gray(...args: any[]) {
    Log.respectProgressBars(() => {
      Log.consoleLog(...Log.withPrefixAndTextColor(args));
    });
  }

  public static clear() {
    process.stdout.write(process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H');
  }

  private static _bundleProgressBar: any;
  private static _oraSpinner: any;

  private static _printNewLineBeforeNextLog = false;
  private static _isLastLineNewLine = false;
  private static _updateIsLastLineNewLine(args: any[]) {
    if (args.length === 0) {
      Log._isLastLineNewLine = true;
    } else {
      const lastArg = args[args.length - 1];
      if (typeof lastArg === 'string' && (lastArg === '' || lastArg.match(/[\r\n]$/))) {
        Log._isLastLineNewLine = true;
      } else {
        Log._isLastLineNewLine = false;
      }
    }
  }

  private static _maybePrintNewLine() {
    if (Log._printNewLineBeforeNextLog) {
      Log._printNewLineBeforeNextLog = false;
      console.log(); // eslint-disable-line no-console
    }
  }

  private static consoleDebug(...args: any[]) {
    Log._maybePrintNewLine();
    Log._updateIsLastLineNewLine(args);

    console.debug(...args); // eslint-disable-line no-console
  }

  private static consoleInfo(...args: any[]) {
    Log._maybePrintNewLine();
    Log._updateIsLastLineNewLine(args);

    console.info(...args); // eslint-disable-line no-console
  }

  private static consoleLog(...args: any[]) {
    Log._maybePrintNewLine();
    Log._updateIsLastLineNewLine(args);

    console.log(...args); // eslint-disable-line no-console
  }

  private static consoleWarn(...args: any[]) {
    Log._maybePrintNewLine();
    Log._updateIsLastLineNewLine(args);

    console.warn(...args); // eslint-disable-line no-console
  }

  private static consoleError(...args: any[]) {
    Log._maybePrintNewLine();
    Log._updateIsLastLineNewLine(args);

    console.error(...args); // eslint-disable-line no-console
  }

  private static respectProgressBars(commitLogs: () => void) {
    if (Log._bundleProgressBar) {
      Log._bundleProgressBar.terminate();
      Log._bundleProgressBar.lastDraw = '';
    }
    if (Log._oraSpinner) {
      Log._oraSpinner.stop();
    }
    commitLogs();

    if (Log._bundleProgressBar) {
      Log._bundleProgressBar.render();
    }
    if (Log._oraSpinner) {
      Log._oraSpinner.start();
    }
  }

  private static getPrefix(chalkColor: Color) {
    return chalkColor(`[${new Date().toTimeString().slice(0, 8)}]`);
  }

  private static withPrefixAndTextColor(args: any[], chalkColor: Color = chalk.gray) {
    if (program.nonInteractive) {
      return [Log.getPrefix(chalkColor), ...args.map(arg => chalkColor(arg))];
    } else {
      return args.map(arg => chalkColor(arg));
    }
  }

  private static withPrefix(args: any[], chalkColor = chalk.gray) {
    if (program.nonInteractive) {
      return [Log.getPrefix(chalkColor), ...args];
    } else {
      return args;
    }
  }
}
