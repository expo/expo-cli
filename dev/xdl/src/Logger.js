/**
 * @flow
 */

import bunyan from 'bunyan';
import path from 'path';

import UserSettings from './UserSettings';

let logger = bunyan.createLogger({
  name: 'exponent',
  streams: [{
    level: 'debug',
    type: 'rotating-file',
    path: path.join(UserSettings.dotExponentHomeDirectory(), 'log'),
    period: '1d',   // daily rotation
    count: 3,       // keep 3 back copies
  }],
});

logger.notifications = logger.child({type: 'notifications'});
logger.global = logger.child({type: 'global'});

export default logger;
