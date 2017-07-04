/**
 * @flow
 */

import bunyan from '@expo/bunyan';
import path from 'path';

import UserSettings from './UserSettings';

class ConsoleRawStream {
  write(rec) {
    if (rec.level < bunyan.INFO) {
      console.log(rec);
    } else if (rec.level < bunyan.WARN) {
      console.info(rec);
    } else if (rec.level < bunyan.ERROR) {
      console.warn(rec);
    } else {
      console.error(rec);
    }
  }
}

// TODO(perry) teach flow about the logger type here
let logger: any = bunyan.createLogger({
  name: 'expo',
  serializers: bunyan.stdSerializers,
  streams: [
    {
      level: 'debug',
      type: 'rotating-file',
      path: path.join(UserSettings.dotExpoHomeDirectory(), 'log'),
      period: '1d', // daily rotation
      count: 3, // keep 3 back copies
    },
    ...(process.env.DEBUG && process.env.NODE_ENV !== 'production'
      ? [
          {
            type: 'raw',
            stream: new ConsoleRawStream(),
            closeOnExit: false,
            level: 'debug',
          },
        ]
      : []),
  ],
});

logger.notifications = logger.child({ type: 'notifications' });
logger.global = logger.child({ type: 'global' });
logger.DEBUG = bunyan.DEBUG;
logger.INFO = bunyan.INFO;
logger.WARN = bunyan.WARN;
logger.ERROR = bunyan.ERROR;

export default logger;
