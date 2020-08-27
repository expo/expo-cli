import bunyan from '@expo/bunyan';
import isEmpty from 'lodash/isEmpty';
import isPlainObject from 'lodash/isPlainObject';
import { Readable } from 'stream';

export enum LogLevel {
  trace = 'trace',
  debug = 'debug',
  info = 'info',
  warn = 'warn',
  error = 'error',
  fatal = 'fatal',
}

type BunyanGetter = () => bunyan;

export class Logger {
  loggerObj: bunyan;
  loggerGetter?: BunyanGetter;
  extraFields: any;

  constructor(bunyanGetter?: BunyanGetter, extraFields?: any) {
    this.loggerObj = bunyan.createLogger({ name: 'xdl-detach' });
    this.loggerGetter = bunyanGetter;
    this.extraFields = extraFields;
  }

  configure(loggerObj: bunyan) {
    this.loggerObj = loggerObj;
  }

  withFields(extraFields: any) {
    const getter = this.loggerGetter || (() => this.loggerObj);
    return new Logger(getter, { ...this.extraFields, ...extraFields });
  }

  trace(...all: any[]) {
    this.logLine(LogLevel.trace, ...all);
  }
  debug(...all: any[]) {
    this.logLine(LogLevel.debug, ...all);
  }
  info(...all: any[]) {
    this.logLine(LogLevel.info, ...all);
  }
  warn(...all: any[]) {
    this.logLine(LogLevel.warn, ...all);
  }
  error(...all: any[]) {
    this.logLine(LogLevel.error, ...all);
  }
  fatal(...all: any[]) {
    this.logLine(LogLevel.fatal, ...all);
  }

  logLine(level: LogLevel, ...args: any[]) {
    const argsToLog = [...args];
    const extraFieldsFromArgsExist = isPlainObject(args[0]);
    const extraFieldsFromArgs = extraFieldsFromArgsExist ? args[0] : {};
    if (extraFieldsFromArgsExist) {
      argsToLog.shift();
    }
    const extraFields = { ...extraFieldsFromArgs, ...this.extraFields };
    if (!isEmpty(extraFields)) {
      argsToLog.unshift(extraFields);
    }

    if (this.loggerGetter) {
      const loggerObj = this.loggerGetter();
      loggerObj[level](...argsToLog);
    } else {
      this.loggerObj[level](...argsToLog);
    }
  }
}

const LoggerDetach = new Logger();
export default LoggerDetach;

export function pipeOutputToLogger(
  { stdout, stderr }: { stdout?: Readable | null; stderr?: Readable | null } = {
    stdout: null,
    stderr: null,
  },
  extraFields = {},
  {
    stdoutOnly = false,
    loggerLineTransformer,
  }: { stdoutOnly?: boolean; loggerLineTransformer?: (line: any) => any } = {}
) {
  if (stdout) {
    stdout.on('data', chunk =>
      logMultiline(chunk, { ...extraFields, source: 'stdout' }, loggerLineTransformer)
    );
  }
  if (stderr) {
    const source = stdoutOnly ? 'stdout' : 'stderr';
    stderr.on('data', chunk =>
      logMultiline(chunk, { ...extraFields, source }, loggerLineTransformer)
    );
  }
}

function logMultiline(data: any, extraFields: any, loggerLineTransformer?: (line: any) => any) {
  if (!data) {
    return;
  }
  const lines = String(data).split('\n');
  lines.forEach(line => {
    const lineToPrint = loggerLineTransformer ? loggerLineTransformer(line) : line;
    if (lineToPrint) {
      const args = [lineToPrint];
      if (!isEmpty(extraFields)) {
        args.unshift(extraFields);
      }
      LoggerDetach.info(...args);
    }
  });
}
