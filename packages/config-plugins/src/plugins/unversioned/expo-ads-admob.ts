import { ConfigPlugin } from '../../Plugin.types';
import { withAdMob as withAdMobAndroid } from '../../android/AdMob';
import { withAdMob as withAdMobIOS } from '../../ios/AdMob';
import { createRunOncePlugin } from '../withRunOnce';
import { withStaticPlugin } from '../withStaticPlugin';

const packageName = 'expo-ads-admob';

export const withAdMob: ConfigPlugin = config => {
  return withStaticPlugin(config, {
    _isLegacyPlugin: true,
    plugin: packageName,
    // If the static plugin isn't found, use the unversioned one.
    fallback: withUnversionedAdMob,
  });
};

const withUnversionedAdMob: ConfigPlugin = createRunOncePlugin(config => {
  config = withAdMobAndroid(config);
  config = withAdMobIOS(config);
  return config;
}, packageName);

export default withAdMob;
