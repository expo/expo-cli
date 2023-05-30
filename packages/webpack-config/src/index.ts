import fs from 'fs';
import { Configuration } from 'webpack';

import { validateEnvironment } from './env';
import { Arguments, Environment, InputEnvironment } from './types';
import webpackConfig from './webpack.config';

function getPossibleProjectRoot(): string {
  return fs.realpathSync(process.cwd());
}

/**
 * Create the official Webpack config for loading Expo web apps.
 *
 * @param env Environment props used to configure features.
 * @param argv
 * @category default
 */
export default async function createWebpackConfigAsync(
  env: InputEnvironment = {},
  argv: Arguments = {}
): Promise<Configuration> {
  if (!env.projectRoot) {
    env.projectRoot = getPossibleProjectRoot();
  }

  const environment: Environment = validateEnvironment(env);

  const config = await webpackConfig(environment, argv);

  // @ts-ignore: deprecated
  if (environment.info) {
    console.warn('environment.info is deprecated');
  }

  if ('offline' in environment) {
    throw new Error(
      'The `offline` flag is deprecated. Please setup a service worker for your web project manually.'
    );
  }
  return config;
}
