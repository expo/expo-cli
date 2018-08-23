/**
 * @flow
 */

import * as Env from './Env';

let scheme = process.env.XDL_SCHEME || 'https';
let host = process.env.XDL_HOST || 'exp.host';
let port: ?number = parseInt(process.env.XDL_PORT, 10) || null;

if (Env.isStaging()) {
  host = 'staging.exp.host';
} else if (Env.isLocal()) {
  scheme = 'http';
  host = 'localhost';
  port = 3000;
}

declare interface XDLConfig {
  api: {
    scheme: string,
    host: string,
    port: ?number,
  };
  ngrok: {
    authToken: string,
    authTokenPublicId: string,
    domain: string,
  };
  developerTool: ?string;
  validation: {
    reactNativeVersionWarnings: boolean,
  };
  helpUrl: string;
  offline: boolean;
  useReduxNotifications: boolean;
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
  developerTool: (null: ?string),
  validation: {
    reactNativeVersionWarnings: true,
  },
  helpUrl: 'https://docs.expo.io/',
  offline: false,
  useReduxNotifications: false,
};

export default config;
