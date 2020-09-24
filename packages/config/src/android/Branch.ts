import { ExpoConfig } from '../Config.types';
import { Document, getMainApplicationXML } from './Manifest';

export function getBranchApiKey(config: ExpoConfig) {
  return config.android?.config?.branch?.apiKey ?? null;
}

export async function setBranchApiKey(config: ExpoConfig, manifestDocument: Document) {
  const apiKey = getBranchApiKey(config);

  if (!apiKey) {
    return manifestDocument;
  }

  let mainApplication = getMainApplicationXML(manifestDocument);

  let existingBranchApiKeyItem;
  const newBranchApiKeyItem = {
    $: {
      'android:name': 'io.branch.sdk.BranchKey',
      'android:value': apiKey,
    },
  };
  if (mainApplication?.['meta-data']) {
    existingBranchApiKeyItem = mainApplication['meta-data'].filter(
      (e: any) => e['$']['android:name'] === 'io.branch.sdk.BranchKey'
    );
    if (existingBranchApiKeyItem.length) {
      existingBranchApiKeyItem[0]['$']['android:value'] = apiKey;
    } else {
      mainApplication['meta-data'].push(newBranchApiKeyItem);
    }
  } else {
    if (!mainApplication) {
      mainApplication = { $: { 'android:name': '.MainApplication' } };
    }
    mainApplication['meta-data'] = [newBranchApiKeyItem];
  }

  return manifestDocument;
}
