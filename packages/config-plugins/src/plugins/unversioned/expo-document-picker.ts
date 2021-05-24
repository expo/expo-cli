import { ExpoConfig } from '@expo/config-types';
import { JSONObject } from '@expo/json-file';

import { ConfigPlugin } from '../../Plugin.types';
import * as WarningAggregator from '../../utils/warnings';
import { withEntitlementsPlist } from '../ios-plugins';
import { createRunOncePlugin } from '../withRunOnce';
import { withStaticPlugin } from '../withStaticPlugin';

const packageName = 'expo-document-picker';

const withICloudEntitlement: ConfigPlugin<{ appleTeamId: string }> = (config, { appleTeamId }) => {
  return withEntitlementsPlist(config, config => {
    config.modResults = setICloudEntitlement(config, config.modResults, appleTeamId);
    return config;
  });
};

function setICloudEntitlement(
  config: ExpoConfig,
  entitlementsPlist: JSONObject,
  appleTeamId: string
): JSONObject {
  if (config.ios?.usesIcloudStorage) {
    // TODO: need access to the appleTeamId for this one!
    WarningAggregator.addWarningIOS(
      'ios.usesIcloudStorage',
      'Enable the iCloud Storage Entitlement from the Capabilities tab in your Xcode project.'
      // TODO: add a link to a docs page with more information on how to do this
    );
  }

  return entitlementsPlist;
}

const withUnversionedDocumentPicker: ConfigPlugin = createRunOncePlugin(config => {
  // No mechanism to get Apple Team ID.
  config = withICloudEntitlement(config, { appleTeamId: 'TODO-GET-APPLE-TEAM-ID' });
  return config;
}, packageName);

const withDocumentPicker: ConfigPlugin = config => {
  return withStaticPlugin(config, {
    _isLegacyPlugin: true,
    plugin: packageName,
    // If the static plugin isn't found, use the unversioned one.
    fallback: withUnversionedDocumentPicker,
  });
};

export default withDocumentPicker;
