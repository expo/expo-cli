import { ExpoConfig } from '@expo/config-types';
import { JSONObject } from '@expo/json-file';

import { ConfigPlugin } from '../../Plugin.types';
import { createEntitlementsPlugin } from '../ios-plugins';
import { createRunOncePlugin } from '../withRunOnce';
import { withStaticPlugin } from '../withStaticPlugin';

const packageName = 'expo-contacts';

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

export const withContacts: ConfigPlugin = config => {
  return withStaticPlugin(config, {
    _isLegacyPlugin: true,
    plugin: packageName,
    // If the static plugin isn't found, use the unversioned one.
    fallback: withUnversionedContacts,
  });
};

const withUnversionedContacts: ConfigPlugin = createRunOncePlugin(config => {
  config = withAccessesContactNotes(config);
  return config;
}, packageName);

export default withUnversionedContacts;
