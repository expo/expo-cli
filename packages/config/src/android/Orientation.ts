import { ExpoConfig } from '../Config.types';
import { Document } from './Manifest';

export const SCREEN_ORIENTATION_ATTRIBUTE = 'android:screenOrientation';

export function getOrientation(config: ExpoConfig) {
  return typeof config.orientation === 'string' ? config.orientation : null;
}

export async function setAndroidOrientation(config: ExpoConfig, manifestDocument: Document) {
  const orientation = getOrientation(config);
  if (!orientation) {
    return manifestDocument;
  }

  let mainActivity = manifestDocument.manifest.application[0].activity.filter(
    (e: any) => e['$']['android:name'] === '.MainActivity'
  );
  mainActivity[0]['$'][SCREEN_ORIENTATION_ATTRIBUTE] = orientation;

  return manifestDocument;
}
