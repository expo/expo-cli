import { ExpoConfig } from '../Config.types';
import { Document, getMainActivity } from './Manifest';

export const SCREEN_ORIENTATION_ATTRIBUTE = 'android:screenOrientation';

export function getOrientation(config: ExpoConfig) {
  return typeof config.orientation === 'string' ? config.orientation : null;
}

export async function setAndroidOrientation(config: ExpoConfig, manifestDocument: Document) {
  const orientation = getOrientation(config);
  if (!orientation) {
    return manifestDocument;
  }

  const mainActivity = getMainActivity(manifestDocument);
  mainActivity['$'][SCREEN_ORIENTATION_ATTRIBUTE] =
    orientation !== 'default' ? orientation : 'unspecified';

  return manifestDocument;
}
