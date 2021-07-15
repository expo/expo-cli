import { ConfigPlugin, withPlugins } from '@expo/config-plugins';

import { withAndroidModules } from './android/withAndroidModules';

export const withExpoModulesPlugin: ConfigPlugin = config => {
  return withPlugins(config, [withAndroidModules]);
};
