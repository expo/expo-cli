import { ExpoConfig } from '../Config.types';
import { MetaDataItemMap } from './Manifest';
import { addOrRemoveMetadataItemInArray, getMetadataFromConfig } from './MetaData';

export function getBranchApiKey(config: ExpoConfig) {
  return config.android?.config?.branch?.apiKey ?? null;
}

export function syncBranchConfigMetaData(config: ExpoConfig): MetaDataItemMap {
  let metadata = getMetadataFromConfig(config);

  const apiKey = getBranchApiKey(config);

  metadata = addOrRemoveMetadataItemInArray(metadata, {
    name: 'io.branch.sdk.BranchKey',
    value: apiKey,
  });

  return metadata;
}
