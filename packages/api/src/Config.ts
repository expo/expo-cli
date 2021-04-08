import getenv from 'getenv';

import * as Env from './Env';

interface ApiConfig {
  scheme: string;
  host: string;
  port: number | null;
}
interface XDLConfig {
  turtleApi: ApiConfig;
  api: ApiConfig;
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
  developerTool: null,
  validation: {
    reactNativeVersionWarnings: true,
  },
  offline: false,
};

export default config;
