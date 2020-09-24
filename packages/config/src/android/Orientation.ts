import { ExpoConfig } from '../Config.types';
import { Document, getMainActivityXML } from './Manifest';

export const SCREEN_ORIENTATION_ATTRIBUTE = 'android:screenOrientation';

export function getOrientation(config: ExpoConfig) {
  return typeof config.orientation === 'string' ? config.orientation : null;
}

export async function setAndroidOrientation(config: ExpoConfig, manifestDocument: Document) {
  const orientation = getOrientation(config);
  if (!orientation) {
    return manifestDocument;
  }

  let mainActivity = getMainActivityXML(manifestDocument);
  if (!mainActivity) {
    mainActivity = { $: { 'android:name': '.MainActivity' } };
  }
  mainActivity['$'][SCREEN_ORIENTATION_ATTRIBUTE] =
    orientation !== 'default' ? orientation : 'unspecified';

  return manifestDocument;
}
