import { ConfigPlugin, withEntitlementsPlist } from '@expo/config-plugins';
import { ExpoConfig } from '@expo/config-types';
import { JSONObject } from '@expo/json-file';

import { createLegacyPlugin } from './createLegacyPlugin';

const withAppleSignInEntitlement: ConfigPlugin = config => {
  return withEntitlementsPlist(config, config => {
    config.modResults = setAppleSignInEntitlement(config, config.modResults);
    return config;
  });
};

function setAppleSignInEntitlement(config: ExpoConfig, entitlementsPlist: JSONObject): JSONObject {
  if (config.ios?.usesAppleSignIn) {
    return {
      ...entitlementsPlist,
      'com.apple.developer.applesignin': ['Default'],
    };
  }

  return entitlementsPlist;
}

export default createLegacyPlugin({
  packageName: 'expo-apple-authentication',
  fallback: [withAppleSignInEntitlement],
});
