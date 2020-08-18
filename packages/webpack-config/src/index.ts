import { getPossibleProjectRoot } from '@expo/config/paths';
import { Configuration } from 'webpack';

import { withWorkbox } from './addons';
import { getPublicPaths, validateEnvironment } from './env';
import { Arguments, DevConfiguration, Environment, InputEnvironment } from './types';
import webpackConfig from './webpack.config';

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
): Promise<Configuration | DevConfiguration> {
  if (!env.projectRoot) {
    env.projectRoot = getPossibleProjectRoot();
  }
  if (!env.platform) {
    // @ts-ignore
    env.platform = process.env.EXPO_WEBPACK_PLATFORM;
  }

  const environment: Environment = validateEnvironment(env);

  const config: Configuration | DevConfiguration = await webpackConfig(environment, argv);

  // @ts-ignore: deprecated
  if (environment.info) {
    console.warn('environment.info is deprecated');
  }

  if (environment.offline === true) {
    const { workbox = {} } = argv;
    const publicUrl = workbox.publicUrl || getPublicPaths(environment).publicUrl;

    // No SW for native
    if (['ios', 'android'].includes(env.platform || '')) {
      return config;
    }

    return withWorkbox(config, {
      projectRoot: environment.projectRoot,
      ...workbox,
      publicUrl,
      platform: env.platform,
    });
  }
  return config;
}
