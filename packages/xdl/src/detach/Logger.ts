import { Readable } from 'stream';

import bunyan from '@expo/bunyan';
import _ from 'lodash';


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
    const extraFieldsFromArgsExist = _.isPlainObject(_.first(args));
    const extraFieldsFromArgs = extraFieldsFromArgsExist ? args[0] : {};
    if (extraFieldsFromArgsExist) {
      argsToLog.shift();
    }
    const extraFields = { ...extraFieldsFromArgs, ...this.extraFields };
    if (!_.isEmpty(extraFields)) {
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
  { stdoutOnly = false } = {}
) {
  if (stdout) {
    stdout.on('data', line => logMultiline(line, { ...extraFields, source: 'stdout' }));
  }
  if (stderr) {
    const source = stdoutOnly ? 'stdout' : 'stderr';
    stderr.on('data', line => logMultiline(line, { ...extraFields, source }));
  }
}

function logMultiline(data: any, extraFields: any) {
  if (!data) {
    return;
  }
  const lines = String(data).split('\n');
  lines.forEach(line => {
    if (line) {
      const args = [line];
      if (!_.isEmpty(extraFields)) {
        args.unshift(extraFields);
      }
      LoggerDetach.info(...args);
    }
  });
}
