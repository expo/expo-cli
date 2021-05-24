import { AndroidConfig, IOSConfig } from '@expo/config-plugins';

import { createLegacyPlugin } from './createLegacyPlugin';

export default createLegacyPlugin({
  packageName: 'expo-branch',
  fallback: [AndroidConfig.Branch.withBranch, IOSConfig.Branch.withBranch],
});
