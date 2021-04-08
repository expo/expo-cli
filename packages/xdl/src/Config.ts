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

function getAPI(): ApiConfig {
  if (Env.isLocal()) {
    return {
      scheme: 'http',
      host: 'localhost',
      port: 3000,
    };
  } else if (Env.isStaging()) {
    return {
      scheme: getenv.string('XDL_SCHEME', 'https'),
      host: 'staging.exp.host',
      port: getenv.int('XDL_PORT', 0) || null,
    };
  } else {
    return {
      scheme: getenv.string('XDL_SCHEME', 'https'),
      host: getenv.string('XDL_HOST', 'exp.host'),
      port: getenv.int('XDL_PORT', 0) || null,
    };
  }
}

const config: XDLConfig = {
  api: getAPI(),
  developerTool: 'expo-cli',
  offline: false,
};

export default config;
