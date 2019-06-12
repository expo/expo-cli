import getenv from 'getenv';

import * as Env from './Env';

let scheme = getenv.string('XDL_SCHEME', 'https');
let host = getenv.string('XDL_HOST', 'exp.host');
let port = getenv.int('XDL_PORT', 0) || null;

if (Env.isStaging()) {
  host = 'staging.exp.host';
} else if (Env.isLocal()) {
  scheme = 'http';
  host = 'localhost';
  port = 3000;
}

interface XDLConfig {
  api: {
    scheme: string;
    host: string;
    port: number | null;
  };
  ngrok: {
    authToken: string;
    authTokenPublicId: string;
    domain: string;
  };
  developerTool: string | null;
  validation: {
    reactNativeVersionWarnings: boolean;
  };
  helpUrl: string;
  offline: boolean;
}

const config: XDLConfig = {
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
  validation: {
    reactNativeVersionWarnings: true,
  },
  helpUrl: 'https://docs.expo.io/',
  offline: false,
};

export default config;
