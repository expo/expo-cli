import { Configuration } from 'webpack';
import { Environment, Arguments } from './types';
import developmentConfig from './webpack.dev';
import productionConfig from './webpack.prod';
import { getMode, getConfig } from './utils';
import * as Diagnosis from './utils/Diagnosis';

export default async function(env: Environment, argv: Arguments): Promise<Configuration> {
  // Fill all config values with PWA defaults
  if (!env.config) {
    env.config = getConfig(env);
  }

  const mode = getMode(env);
  let config;
  if (mode === 'development') {
    config = await developmentConfig(env, argv);
  } else {
    config = await productionConfig(env, argv);
  }

  if (env.info) {
    Diagnosis.reportAsync(config, env);
  }

  return config;
}
