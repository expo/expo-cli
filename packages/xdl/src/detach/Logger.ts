import { Readable } from 'stream';

import bunyan from '@expo/bunyan';
import _ from 'lodash';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export class Logger {
  loggerObj: any;
  configured: boolean;
  selfConfigured: boolean;
  extraFields: any;

  constructor() {
    this.configured = process.env.JSON_LOGS === '1';
    this.loggerObj = this.configured ? bunyan.createLogger({ name: 'xdl-detach' }) : console;
    this.selfConfigured = this.configured && true;
    this.extraFields = {};
  }

  configure(loggerObj: Console | bunyan) {
    this.loggerObj = loggerObj;
    this.configured = true;
    this.selfConfigured = false;
  }

  withFields(extraFields: any) {
    return Object.assign({}, this, { extraFields: { ...this.extraFields, ...extraFields } });
  }

  trace(...args: any[]) {
    this.logLine('trace', ...args);
  }
  debug(...args: any[]) {
    this.logLine('debug', ...args);
  }
  info(...args: any[]) {
    this.logLine('info', ...args);
  }
  warn(...args: any[]) {
    this.logLine('warn', ...args);
  }
  error(...args: any[]) {
    this.logLine('error', ...args);
  }
  fatal(...args: any[]) {
    this.logLine('fatal', ...args);
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
    this.loggerObj[level](...argsToLog);
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
  { stdoutOnly = false, dontShowStdout = false } = {}
) {
  if (stdout) {
    const stdoutExtraFields = { ...extraFields, dontShowStdout: false };
    if (dontShowStdout) {
      stdoutExtraFields.dontShowStdout = true;
    }
    stdout.on('data', line => logMultiline(line, { ...stdoutExtraFields, source: 'stdout' }));
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
      if (LoggerDetach.configured) {
        args.unshift(extraFields);
      }
      const shouldntLogMessage =
        extraFields.source === 'stdout' &&
        extraFields.dontShowStdout &&
        LoggerDetach.configured &&
        !LoggerDetach.selfConfigured;
      if (!shouldntLogMessage) {
        LoggerDetach.info(...args);
      }
    }
  });
}
