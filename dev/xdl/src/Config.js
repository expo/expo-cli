'use strict';

import Env from './Env';

let scheme = 'https';
let host = process.env.XDL_HOST || 'exp.host';
let port = process.env.XDL_PORT || null;

if (Env.isStaging()) {
  host = 'staging.exp.host';
} else if (Env.isLocal()) {
  scheme = 'http';
  host = 'localhost';
  port = 3000;
}

module.exports = {
  api: {
    scheme,
    host,
    port,
  },
  ngrok: {
    authToken: '5W1bR67GNbWcXqmxZzBG1_56GezNeaX6sSRvn8npeQ8',
    authTokenPublicId: '5W1bR67GNbWcXqmxZzBG1',
    domain: 'exp.direct',
  },
  developerTool: null,
};
