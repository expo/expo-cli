import { ConfigPlugin } from '../../Plugin.types';
import { withFacebookAppIdString, withFacebookManifest } from '../../android/Facebook';
import { withFacebook as withFacebookIOS } from '../../ios/Facebook';
import { createRunOncePlugin } from '../withRunOnce';
import { withStaticPlugin } from '../withStaticPlugin';

// Local unversioned facebook plugin

const packageName = 'expo-facebook';

export const withFacebook: ConfigPlugin = config => {
  return withStaticPlugin(config, {
    _isLegacyPlugin: true,
    plugin: packageName,
    // If the static plugin isn't found, use the unversioned one.
    fallback: withUnversionedFacebook,
  });
};

const withUnversionedFacebook: ConfigPlugin = createRunOncePlugin(config => {
  config = withFacebookManifest(config);
  config = withFacebookAppIdString(config);
  config = withFacebookIOS(config);
  return config;
}, packageName);

export default withFacebook;
