import { ConfigPlugin } from '../../Plugin.types';
import { withBranch as withBranchAndroid } from '../../android/Branch';
import { withBranch as withBranchIOS } from '../../ios/Branch';
import { createRunOncePlugin } from '../withRunOnce';
import { withStaticPlugin } from '../withStaticPlugin';

const packageName = 'expo-branch';

export const withBranch: ConfigPlugin = config => {
  return withStaticPlugin(config, {
    _isLegacyPlugin: true,
    plugin: packageName,
    // If the static plugin isn't found, use the unversioned one.
    fallback: withUnversionedBranch,
  });
};

const withUnversionedBranch: ConfigPlugin = createRunOncePlugin(config => {
  config = withBranchAndroid(config);
  config = withBranchIOS(config);
  return config;
}, packageName);

export default withBranch;
