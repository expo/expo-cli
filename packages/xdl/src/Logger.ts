import bunyan from '@expo/bunyan';

import { DebugLogStream } from './logs/DebugLogStream';

class ConsoleRawStream {
  write(record: any) {
    if (record.level < bunyan.INFO) {
      console.log(record);
    } else if (record.level < bunyan.WARN) {
      console.info(record);
    } else if (record.level < bunyan.ERROR) {
      console.warn(record);
    } else {
      console.error(record);
    }
  }
}

const logger = bunyan.createLogger({
  name: 'expo',
  serializers: bunyan.stdSerializers,
  streams: getLoggerStreams(),
});

function getLoggerStreams() {
  const streams: bunyan.Stream[] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction && process.env.EXPO_DEBUG) {
    streams.push({
      type: 'raw',
      stream: new DebugLogStream(process.env.EXPO_DEBUG),
      closeOnExit: false,
      level: 'debug',
    });
  }

  if (!isProduction && process.env.EXPO_RAW_LOG) {
    streams.push({
      type: 'raw',
      stream: new ConsoleRawStream(),
      closeOnExit: false,
      level: 'debug',
    });
  }

  return streams;
}

export type LogStream = bunyan.Stream;
export type Log = bunyan;

export default {
  child: (options: object) => logger.child(options),
  debug: (tag: string) => logger.child({ type: 'debug', tag }),
  notifications: logger.child({ type: 'notifications' }),
  global: logger.child({ type: 'global' }),
  DEBUG: bunyan.DEBUG,
  INFO: bunyan.INFO,
  WARN: bunyan.WARN,
  ERROR: bunyan.ERROR,
};
