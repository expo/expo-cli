import getenv from 'getenv';

import { Env } from './internal';

interface ApiConfig {
  scheme: string;
  host: string;
  port: number | null;
}
interface XDLConfig {
  api: ApiConfig;
  developerTool: string;
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

let api: ApiConfig;
if (Env.isLocal()) {
  api = apiConfig.local;
} else if (Env.isStaging()) {
  api = apiConfig.staging;
} else {
  api = apiConfig.production;
}

const config: XDLConfig = {
  api,
  developerTool: 'expo-cli',
  offline: false,
};

export default config;
