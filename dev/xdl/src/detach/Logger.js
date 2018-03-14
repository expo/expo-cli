import bunyan from '@expo/bunyan';

const PRINT_JSON_LOGS = process.env.JSON_LOGS === '1';
const LOGGER_NAME = 'xdl-detach';

const logger = PRINT_JSON_LOGS ? bunyan.createLogger({ name: LOGGER_NAME }) : console;
logger.withFields = extraFields => withFields(logger, extraFields);

export default logger;

const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

export function withFields(logger, extraFields) {
  if (!PRINT_JSON_LOGS) {
    return console;
  }

  return levels.reduce((obj, level) => {
    obj[level] = (...args) => logger[level](extraFields, ...args);
    return obj;
  }, {});
}

export function pipeOutputToLogger({ stdout, stderr } = {}, extraFields = {}, stdoutOnly = false) {
  if (stdout) {
    stdout.on('data', line => logMultiline(line, { ...extraFields, source: 'stdout' }));
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
      if (PRINT_JSON_LOGS) {
        args.unshift(extraFields);
      }
      logger.info(...args);
    }
  });
}
