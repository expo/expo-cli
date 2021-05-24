import { withBranch as withBranchAndroid } from '../../android/Branch';
import { withBranch as withBranchIOS } from '../../ios/Branch';
import { createLegacyPlugin } from './createLegacyPlugin';

export default createLegacyPlugin({
  packageName: 'expo-branch',
  fallback: [withBranchAndroid, withBranchIOS],
});
