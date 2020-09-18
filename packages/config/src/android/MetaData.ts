import { ExpoConfig } from '../Config.types';
import {
  addMetaDataItemToMainApplication,
  Document,
  getMainApplication,
  MetaDataItemMap,
  removeAllMetaDataItemsFromMainApplication,
} from './Manifest';

export function getMetadataFromConfig(config: Pick<ExpoConfig, 'android'>): any {
  return config.android?.metadata ?? {};
}

export function addOrRemoveMetadataItemInArray(
  metadata: MetaDataItemMap,
  item: { name: string; value: any },
  shouldAdd: boolean = item.value != null
): MetaDataItemMap {
  if (shouldAdd) {
    metadata[item.name] = {
      value: typeof item.value === 'boolean' ? String(item.value) : item.value,
    };
  } else if (item.name) {
    delete metadata[item.name];
  }

  return metadata;
}

export function setMetadataXML(
  config: Pick<ExpoConfig, 'android'>,
  manifestDocument: Document
): Document {
  let mainApplication = getMainApplication(manifestDocument);

  const metaData = getMetadataFromConfig(config);

  // Clear all meta data tags first
  removeAllMetaDataItemsFromMainApplication(mainApplication);

  // TODO: We can speed this up since we don't need to filter the intents each time
  for (const key of Object.keys(metaData)) {
    mainApplication = addMetaDataItemToMainApplication(mainApplication, {
      name: key,
      ...metaData[key],
    });
  }

  return manifestDocument;
}
