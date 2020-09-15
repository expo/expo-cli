import { ExpoConfig } from '../Config.types';
import { MetaDataItem } from './Manifest';
import { addOrRemoveMetaDataItemInArray } from './MetaData';

export function getBranchApiKey(config: ExpoConfig) {
  return config.android?.config?.branch?.apiKey ?? null;
}

export function syncBranchConfigMetaData(config: ExpoConfig): MetaDataItem[] {
  let metadata = config.android?.metadata ?? [];
  metadata = metadata as MetaDataItem[];

  const apiKey = getBranchApiKey(config);

  metadata = addOrRemoveMetaDataItemInArray(metadata, {
    name: 'io.branch.sdk.BranchKey',
    value: apiKey,
  });

  return metadata;
}
