import Env from './Env';

interface ApiConfig {
  scheme: string;
  host: string;
  port: number | null;
}

interface ProcessSettings {
  api: ApiConfig;
  developerTool: string;
  isOffline: boolean;
}

function getAPI(): ApiConfig {
  if (Env.EXPO_LOCAL) {
    return {
      scheme: 'http',
      host: 'localhost',
      port: 3000,
    };
  } else if (Env.EXPO_STAGING) {
    return {
      scheme: Env.XDL_SCHEME,
      host: 'staging.exp.host',
      port: Env.XDL_PORT || null,
    };
  } else {
    return {
      scheme: Env.XDL_SCHEME,
      host: Env.XDL_HOST,
      port: Env.XDL_PORT || null,
    };
  }
}

const settings: ProcessSettings = {
  api: getAPI(),
  developerTool: 'expo-cli',
  isOffline: false,
};

export default settings;
