import { ConfigPlugin, ExpoConfig } from '../Config.types';
import { Document, getMainApplication, withManifest } from './Manifest';

export function getBranchApiKey(config: ExpoConfig) {
  return config.android?.config?.branch?.apiKey ?? null;
}

export const withBranch: ConfigPlugin = config => {
  return withManifest(config, async props => ({
    ...props,
    data: await setBranchApiKey(config.exp, props.data!),
  }));
};

export async function setBranchApiKey(config: ExpoConfig, manifestDocument: Document) {
  const apiKey = getBranchApiKey(config);

  if (!apiKey) {
    return manifestDocument;
  }

  const mainApplication = getMainApplication(manifestDocument);

  let existingBranchApiKeyItem;
  const newBranchApiKeyItem = {
    $: {
      'android:name': 'io.branch.sdk.BranchKey',
      'android:value': apiKey,
    },
  };
  if (mainApplication.hasOwnProperty('meta-data')) {
    existingBranchApiKeyItem = mainApplication['meta-data'].filter(
      (e: any) => e['$']['android:name'] === 'io.branch.sdk.BranchKey'
    );
    if (existingBranchApiKeyItem.length) {
      existingBranchApiKeyItem[0]['$']['android:value'] = apiKey;
    } else {
      mainApplication['meta-data'].push(newBranchApiKeyItem);
    }
  } else {
    mainApplication['meta-data'] = [newBranchApiKeyItem];
  }

  return manifestDocument;
}
