import bunyan from '@expo/bunyan';

class ConsoleRawStream {
  write(record: any) {
    if (record.level < bunyan.DEBUG) {
      console.debug(record);
    } else if (record.level < bunyan.INFO) {
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
  streams:
    process.env.EXPO_RAW_LOG && process.env.NODE_ENV !== 'production'
      ? [
          {
            type: 'raw',
            stream: new ConsoleRawStream(),
            closeOnExit: false,
            level: 'debug',
          },
        ]
      : [],
});

export type LogStream = bunyan.Stream;
export type Log = bunyan;

export default {
  child: (options: object) => logger.child(options),
  notifications: logger.child({ type: 'notifications' }),
  global: logger.child({ type: 'global' }),
  DEBUG: bunyan.DEBUG,
  INFO: bunyan.INFO,
  WARN: bunyan.WARN,
  ERROR: bunyan.ERROR,
};
