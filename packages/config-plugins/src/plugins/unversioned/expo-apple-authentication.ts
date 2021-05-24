import { ExpoConfig } from '@expo/config-types';
import { JSONObject } from '@expo/json-file';

import { ConfigPlugin } from '../../Plugin.types';
import { createEntitlementsPlugin } from '../ios-plugins';
import { createRunOncePlugin } from '../withRunOnce';
import { withStaticPlugin } from '../withStaticPlugin';

const packageName = 'expo-apple-authentication';

const withAppleSignInEntitlement = createEntitlementsPlugin(
  setAppleSignInEntitlement,
  'withAppleSignInEntitlement'
);

function setAppleSignInEntitlement(config: ExpoConfig, entitlementsPlist: JSONObject): JSONObject {
  if (config.ios?.usesAppleSignIn) {
    return {
      ...entitlementsPlist,
      'com.apple.developer.applesignin': ['Default'],
    };
  }

  return entitlementsPlist;
}

export const withAppleAuthentication: ConfigPlugin = config => {
  return withStaticPlugin(config, {
    _isLegacyPlugin: true,
    plugin: packageName,
    // If the static plugin isn't found, use the unversioned one.
    fallback: withUnversionedAppleAuthentication,
  });
};

const withUnversionedAppleAuthentication: ConfigPlugin = createRunOncePlugin(config => {
  config = withAppleSignInEntitlement(config);
  return config;
}, packageName);

export default withAppleAuthentication;
