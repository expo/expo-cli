import getenv from 'getenv';

import { Env } from './internal';

interface ApiConfig {
  scheme: string;
  host: string;
  port: number | null;
}
interface XDLConfig {
  turtleApi: ApiConfig;
  api: ApiConfig;
  ngrok: {
    authToken: string;
    authTokenPublicId: string;
    domain: string;
  };
  developerTool: string | null;
  validation: {
    reactNativeVersionWarnings: boolean;
  };
  offline: boolean;
}

type Environment = 'local' | 'staging' | 'production';

const apiConfig: { [env in Environment]: ApiConfig } = {
  local: {
    scheme: 'http',
    host: 'localhost',
    port: 3000,
  },
  staging: {
    scheme: getenv.string('XDL_SCHEME', 'https'),
    host: 'staging.exp.host',
    port: getenv.int('XDL_PORT', 0) || null,
  },
  production: {
    scheme: getenv.string('XDL_SCHEME', 'https'),
    host: getenv.string('XDL_HOST', 'exp.host'),
    port: getenv.int('XDL_PORT', 0) || null,
  },
};

const turtleApiConfig: { [env in Environment]: ApiConfig } = {
  local: {
    scheme: 'http',
    host: 'localhost',
    port: 3006,
  },
  staging: {
    scheme: 'https',
    host: 'staging.turtle.expo.io',
    port: 443,
  },
  production: {
    scheme: 'https',
    host: 'turtle.expo.io',
    port: 443,
  },
};

let api: ApiConfig = apiConfig.production;
let turtleApi: ApiConfig = turtleApiConfig.production;
if (Env.isLocal()) {
  api = apiConfig.local;
  turtleApi = turtleApiConfig.local;
} else if (Env.isStaging()) {
  api = apiConfig.staging;
  turtleApi = turtleApiConfig.staging;
}

const config: XDLConfig = {
  api,
  turtleApi,
  ngrok: {
    authToken: '5W1bR67GNbWcXqmxZzBG1_56GezNeaX6sSRvn8npeQ8',
    authTokenPublicId: '5W1bR67GNbWcXqmxZzBG1',
    domain: 'exp.direct',
  },
  developerTool: null,
  validation: {
    reactNativeVersionWarnings: true,
  },
  offline: false,
};

export default config;
