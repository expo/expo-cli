import { ExpoConfig } from '@expo/config-types';
import { JSONObject } from '@expo/json-file';

import { createEntitlementsPlugin } from '../ios-plugins';
import { createLegacyPlugin } from './createLegacyPlugin';

const withAccessesContactNotes = createEntitlementsPlugin(
  setAccessesContactNotes,
  'withAccessesContactNotes'
);

function setAccessesContactNotes(config: ExpoConfig, entitlementsPlist: JSONObject): JSONObject {
  if (config.ios?.accessesContactNotes) {
    return {
      ...entitlementsPlist,
      'com.apple.developer.contacts.notes': true,
    };
  }

  return entitlementsPlist;
}

export default createLegacyPlugin({
  packageName: 'expo-contacts',
  fallback: [withAccessesContactNotes],
});
