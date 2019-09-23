import { Configuration } from 'webpack';
import merge from 'webpack-merge';

import { Arguments, DevConfiguration, InputEnvironment, Environment } from './types';
import * as Diagnosis from './utils/Diagnosis';
import { validateEnvironment } from './utils/validate';
import webpackConfig from './webpack.config.unimodules';

// Wrap your existing webpack config with support for Unimodules.
// ex: Storybook `({ config }) => withUnimodules(config)`
export default function withUnimodules(
  inputWebpackConfig: DevConfiguration | Configuration = {},
  env: InputEnvironment,
  argv: Arguments = {}
): DevConfiguration | Configuration {
  const environment: Environment = validateEnvironment(env);

  const config = webpackConfig(
    {
      // Attempt to use the input webpack config mode
      mode: inputWebpackConfig.mode,
      ...environment,
    },
    argv
  );

  const mixedConfig = merge(config, inputWebpackConfig);

  if (environment.info) {
    Diagnosis.reportAsync(mixedConfig, environment);
  }

  return mixedConfig;
}
