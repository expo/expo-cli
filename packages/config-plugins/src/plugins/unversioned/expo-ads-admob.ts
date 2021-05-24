import { withAdMob as withAdMobAndroid } from '../../android/AdMob';
import { withAdMob as withAdMobIOS } from '../../ios/AdMob';
import { createLegacyPlugin } from './createLegacyPlugin';

export default createLegacyPlugin({
  packageName: 'expo-ads-admob',
  fallback: [withAdMobAndroid, withAdMobIOS],
});
