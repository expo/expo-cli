import { ExpoConfig } from '@expo/config-types';
import chalk from 'chalk';

import { ConfigPlugin, ModPlatform } from '../Plugin.types';
import * as WarningAggregator from './warnings';

export function wrapWithWithDeprecationWarning<T>({
  plugin,
  platform,
  packageName,
  unversionedName,
  updateUrl,
  shouldWarn,
}: {
  plugin: ConfigPlugin<T>;
  updateUrl: string;
  platform: ModPlatform;
  packageName: string;
  unversionedName: string;
  shouldWarn: (config: ExpoConfig) => boolean;
}): ConfigPlugin<T> {
  return (config, props) => {
    // Only warn if the user intends to enable an API for their app, otherwise there will be a flood of messages for every API.
    if (shouldWarn(config)) {
      WarningAggregator.addWarningForPlatform(
        platform,
        'deprecated-plugin',
        `Unversioned "${unversionedName}" plugin is deprecated, please update your Expo config to using the versioned plugin "${packageName}". Guide ${chalk.underline(
          updateUrl
        )}`
      );
    }
    return plugin(config, props);
  };
}
