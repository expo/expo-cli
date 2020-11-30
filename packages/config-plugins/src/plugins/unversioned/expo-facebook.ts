import { withFacebookAppIdString, withFacebookManifest } from '../../android/Facebook';
import { withFacebook as withFacebookIOS } from '../../ios/Facebook';
import { createRunOncePlugin } from '../core-plugins';

// Local unversioned facebook plugin
const withFacebook = createRunOncePlugin(config => {
  config = withFacebookManifest(config);
  config = withFacebookAppIdString(config);
  config = withFacebookIOS(config);
  return config;
}, 'expo-facebook');

export default withFacebook;
