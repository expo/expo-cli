import { ConfigPlugin } from '../../Plugin.types';
import {
  getBranchApiKey as getBranchAndroid,
  withBranch as withBranchAndroid,
} from '../../android/Branch';
import { getBranchApiKey as getBranchIos, withBranch as withBranchIOS } from '../../ios/Branch';
import { wrapWithWarning } from '../../utils/deprecation';
import { createRunOncePlugin } from '../core-plugins';
import { withStaticPlugin } from '../static-plugins';

const packageName = 'expo-branch';

export const withBranch: ConfigPlugin = createRunOncePlugin(config => {
  return withStaticPlugin(config, {
    plugin: packageName,
    fallback: wrapWithWarning({
      packageName,
      minimumVersion: '41.0.0',
      unversionedName: 'Branch',
      updateUrl: '...',
      plugin: withUnversionedBranch,
      shouldWarn(config) {
        return !!(getBranchIos(config) ?? getBranchAndroid(config));
      },
    }),
  });
}, packageName);

const withUnversionedBranch: ConfigPlugin = config => {
  config = withBranchAndroid(config);
  config = withBranchIOS(config);
  return config;
};

export default withBranch;
