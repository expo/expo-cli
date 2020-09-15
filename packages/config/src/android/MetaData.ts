import { ExpoConfig } from '../Config.types';
import { Document, addMetaDataItemToMainApplication } from './Manifest';

export async function setMetaData(config: ExpoConfig, manifestDocument: Document) {
  let mainApplication = manifestDocument?.manifest?.application?.filter(
    (e: any) => e['$']['android:name'] === '.MainApplication'
  )[0];

  // @ts-ignore
  const metaData = config.android?.metaData ?? {};

  // TODO: Clear all metadata first...
  for (const key of Object.keys(metaData)) {
    mainApplication = addMetaDataItemToMainApplication(mainApplication, key, metaData[key]);
  }

  return manifestDocument;
}
