import { Configuration } from 'webpack';

import { Arguments, DevConfiguration, Environment, InputEnvironment } from './types';
import * as Diagnosis from './Diagnosis';
import { getPublicPaths, validateEnvironment } from './env';
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

  const { workbox = {} } = argv;

  const publicUrl = workbox.publicUrl || getPublicPaths(environment).publicUrl;

  return withWorkbox(config, { projectRoot: environment.projectRoot, ...workbox, publicUrl });
}
