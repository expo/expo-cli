'use strict';

import Env from './Env';

module.exports = {
  api: {
    host: process.env.XDL_HOST || (Env.isStaging() ? 'staging.exp.host' : 'exp.host'),
    port: process.env.XDL_PORT || null,
    //host: 'localhost',
    //port: 3000,
  },
  ngrok: {
    authToken: '5W1bR67GNbWcXqmxZzBG1_56GezNeaX6sSRvn8npeQ8',
    authTokenPublicId: '5W1bR67GNbWcXqmxZzBG1',
    domain: 'exp.direct',
  },
  developerTool: null,
};
