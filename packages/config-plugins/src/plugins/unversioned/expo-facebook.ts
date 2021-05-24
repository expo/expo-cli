import { withFacebookAppIdString, withFacebookManifest } from '../../android/Facebook';
import { withFacebook as withFacebookIOS } from '../../ios/Facebook';
import { createLegacyPlugin } from './createLegacyPlugin';

export default createLegacyPlugin({
  packageName: 'expo-facebook',
  fallback: [withFacebookManifest, withFacebookAppIdString, withFacebookIOS],
});
