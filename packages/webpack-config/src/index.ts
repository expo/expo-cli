import { Configuration } from 'webpack';
import { Environment, InputEnvironment, Arguments, DevConfiguration } from './types';
import developmentConfig from './webpack.dev';
import productionConfig from './webpack.prod';
import { getMode } from './utils';
import * as Diagnosis from './utils/Diagnosis';
import { validateEnvironment } from './utils/validate';

export default async function(
  env: InputEnvironment,
  argv: Arguments = {}
): Promise<Configuration | DevConfiguration> {
  const environment: Environment = validateEnvironment(env);
  const mode = getMode(environment);
  let config: Configuration | DevConfiguration;
  if (mode === 'development') {
    config = await developmentConfig(environment, argv);
  } else {
    config = await productionConfig(environment, argv);
  }

  if (environment.info) {
    Diagnosis.reportAsync(config, environment);
  }

  return config;
}
