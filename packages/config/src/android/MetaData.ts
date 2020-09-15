import { ExpoConfig } from '../Config.types';
import {
  Document,
  MetaDataItem,
  addMetaDataItemToMainApplication,
  removeAllMetaDataItemsFromMainApplication,
} from './Manifest';

export function removeMetaDataItem(metadata: MetaDataItem[], name: string): MetaDataItem[] {
  metadata = metadata.filter(item => name === item.name);
  return metadata;
}

export function addOrRemoveMetaDataItemInArray(
  metadata: MetaDataItem[],
  item: { name: string; value: any }
): MetaDataItem[] {
  if (item.value != null) {
    metadata.push({
      name: item.name,
      value: typeof item.value === 'boolean' ? String(item.value) : item.value,
    });
  } else {
    metadata = removeMetaDataItem(metadata, item.name);
  }

  return metadata;
}

export function setMetaData(config: ExpoConfig, manifestDocument: Document): Document {
  let mainApplication = manifestDocument?.manifest?.application?.filter(
    (e: any) => e['$']['android:name'] === '.MainApplication'
  )[0];

  // @ts-ignore
  const metaData = config.android?.metadata ?? [];

  removeAllMetaDataItemsFromMainApplication(mainApplication);

  // TODO: Clear all metadata first...
  for (const item of metaData as MetaDataItem[]) {
    mainApplication = addMetaDataItemToMainApplication(mainApplication, item);
  }

  return manifestDocument;
}
