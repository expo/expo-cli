'use strict';

import bunyan from 'bunyan';
import path from 'path';

import UserSettings from './UserSettings';

export default bunyan.createLogger({
  name: 'exponent',
  streams: [{
    type: 'rotating-file',
    path: path.join(UserSettings.dotExponentHomeDirectory(), 'log'),
    period: '1d',   // daily rotation
    count: 3,       // keep 3 back copies
  }],
});
