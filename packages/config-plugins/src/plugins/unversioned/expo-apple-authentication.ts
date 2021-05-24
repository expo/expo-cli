import { ExpoConfig } from '@expo/config-types';
import { JSONObject } from '@expo/json-file';

import { createEntitlementsPlugin } from '../ios-plugins';
import { createLegacyPlugin } from './createLegacyPlugin';

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

export default createLegacyPlugin({
  packageName: 'expo-apple-authentication',
  fallback: [withAppleSignInEntitlement],
});
