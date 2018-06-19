import bunyan from '@expo/bunyan';
import _ from 'lodash';

const PRINT_JSON_LOGS = process.env.JSON_LOGS === '1';
const LOGGER_NAME = 'xdl-detach';
const LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

const logger = {
  init(levels) {
    this.loggerObj = PRINT_JSON_LOGS ? bunyan.createLogger({ name: LOGGER_NAME }) : console;
    this.configured = PRINT_JSON_LOGS;
    this.selfConfigured = this.configured && true;
    this.extraFields = {};
    levels.forEach(level => {
      this[level] = function(...args) {
        this.logLine(level, ...args);
      };
    });
  },
  configure(loggerObj) {
    this.loggerObj = loggerObj;
    this.configured = true;
    this.selfConfigured = false;
  },
  withFields(extraFields) {
    return Object.assign({}, this, { extraFields: { ...this.extraFields, ...extraFields } });
  },
  logLine(level, ...args) {
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
  },
};

logger.init(LEVELS);

export default logger;

export function pipeOutputToLogger(
  { stdout, stderr } = {},
  extraFields = {},
  { stdoutOnly = false, dontShowStdout = false } = {}
) {
  if (stdout) {
    const stdoutExtraFields = { ...extraFields };
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

function logMultiline(data, extraFields) {
  if (!data) {
    return;
  }
  const lines = String(data).split('\n');
  lines.forEach(line => {
    if (line) {
      const args = [line];
      if (logger.configured) {
        args.unshift(extraFields);
      }
      const shouldntLogMessage =
        extraFields.source === 'stdout' &&
        extraFields.dontShowStdout &&
        logger.configured &&
        !logger.selfConfigured;
      if (!shouldntLogMessage) {
        logger.info(...args);
      }
    }
  });
}
