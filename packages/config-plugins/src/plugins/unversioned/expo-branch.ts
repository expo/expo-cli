import { withBranch as withBranchAndroid } from '../../android/Branch';
import { withBranch as withBranchIOS } from '../../ios/Branch';
import { createRunOncePlugin } from '../core-plugins';

// Local unversioned branch plugin
const withBranch = createRunOncePlugin(config => {
  config = withBranchAndroid(config);
  config = withBranchIOS(config);
  return config;
}, 'expo-branch');

export default withBranch;
