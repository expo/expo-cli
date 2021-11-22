import { ConfigPlugin, ModPlatform, WarningAggregator } from '@expo/config-plugins';

import { createLegacyPlugin } from '../createLegacyPlugin';

export const createPlugin = (platform: ModPlatform) => {
  const withBranchWarning: ConfigPlugin = config => {
    // @ts-ignore
    if (config[platform]?.config?.branch?.apiKey != null) {
      WarningAggregator.addWarningForPlatform(
        platform,
        `${platform}.config.branch.apiKey`,
        'expo-branch has been deprecated in favor of react-native-branch. Please install react-native-branch in your project and setup the Expo config plugin.'
      );
    }
    return config;
  };
  return withBranchWarning;
};

export default createLegacyPlugin({
  packageName: 'expo-branch',
  fallback: [createPlugin('android'), createPlugin('ios')],
});
