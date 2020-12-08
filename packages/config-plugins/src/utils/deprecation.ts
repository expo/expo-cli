import { ExpoConfig } from '@expo/config-types';
import chalk from 'chalk';

import { ConfigPlugin } from '../Plugin.types';
import { gteSdkVersion } from './versions';
import * as WarningAggregator from './warnings';

export function wrapWithWarning<T>({
  plugin,
  packageName,
  minimumVersion,
  unversionedName,
  updateUrl,
  shouldWarn,
}: {
  plugin: ConfigPlugin<T>;
  updateUrl: string;
  minimumVersion: string;
  packageName: string;
  unversionedName: string;
  shouldWarn: (config: ExpoConfig) => boolean;
}): ConfigPlugin<T> {
  return (config, props) => {
    // First version with plugin support
    if (gteSdkVersion(config, minimumVersion)) {
      // Only warn if the user intends to enable an API for their app, otherwise there will be a flood of messages for every API.
      if (shouldWarn(config)) {
        WarningAggregator.addWarningGeneral(
          'deprecated-plugin',
          `Unversioned "${unversionedName}" plugin is deprecated, please update your Expo config to use the versioned plugin "${packageName}". Guide ${chalk.underline(
            updateUrl
          )}`
        );
      }
    }
    return plugin(config, props);
  };
}
