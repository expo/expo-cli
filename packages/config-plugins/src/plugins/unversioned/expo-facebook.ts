import { ConfigPlugin } from '../../Plugin.types';
import { withFacebookAppIdString, withFacebookManifest } from '../../android/Facebook';
import {
  getFacebookAppId,
  getFacebookDisplayName,
  getFacebookScheme,
  withFacebook as withFacebookIOS,
} from '../../ios/Facebook';
import { wrapWithWarning } from '../../utils/deprecation';
import { createRunOncePlugin } from '../core-plugins';
import { withStaticPlugin } from '../static-plugins';

// Local unversioned facebook plugin

const packageName = 'expo-facebook';

export const withFacebook: ConfigPlugin = createRunOncePlugin(config => {
  return withStaticPlugin(config, {
    plugin: packageName,
    fallback: wrapWithWarning({
      packageName,
      minimumVersion: '41.0.0',
      unversionedName: 'Facebook',
      updateUrl: '...',
      plugin: withUnversionedFacebook,
      shouldWarn(config) {
        return !!(
          getFacebookAppId(config) ??
          getFacebookDisplayName(config) ??
          getFacebookScheme(config)
        );
      },
    }),
  });
}, packageName);

const withUnversionedFacebook: ConfigPlugin = config => {
  config = withFacebookManifest(config);
  config = withFacebookAppIdString(config);
  config = withFacebookIOS(config);
  return config;
};

export default withFacebook;
