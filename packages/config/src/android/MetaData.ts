import { ExpoConfig } from '../Config.types';
import {
  Document,
  MetaDataItemMap,
  addMetaDataItemToMainApplication,
  getMainApplication,
  removeAllMetaDataItemsFromMainApplication,
} from './Manifest';

export function addOrRemoveMetaDataItemInArray(
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

export function setMetaDataXML(
  config: Pick<ExpoConfig, 'android'>,
  manifestDocument: Document
): Document {
  let mainApplication = getMainApplication(manifestDocument);

  const metaData = config.android?.metadata ?? {};

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
