import { Configuration } from 'webpack';

import { Arguments, DevConfiguration, Environment, InputEnvironment } from './types';
import * as Diagnosis from './Diagnosis';
import { validateEnvironment } from './env';
import webpackConfig from './webpack.config';
import { withWorkbox } from './addons';

export default async function(
  env: InputEnvironment,
  argv: Arguments = {}
): Promise<Configuration | DevConfiguration> {
  const environment: Environment = validateEnvironment(env);

  const config: Configuration | DevConfiguration = await webpackConfig(environment, argv);

  if (environment.info) {
    Diagnosis.reportAsync(config, environment);
  }

  return withWorkbox(config, { projectRoot: environment.projectRoot, ...argv.workbox });
}
