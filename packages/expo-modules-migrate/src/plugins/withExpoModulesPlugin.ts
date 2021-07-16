import { ConfigPlugin } from '@expo/config-plugins';

import { withAndroidModules } from './android/withAndroidModules';

export const withExpoModulesPlugin: ConfigPlugin = config => {
  config = withAndroidModules(config);
  return config;
};
