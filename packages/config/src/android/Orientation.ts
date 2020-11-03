import { ExpoConfig } from '../Config.types';
import { AndroidManifest, getMainActivity } from './Manifest';

export const SCREEN_ORIENTATION_ATTRIBUTE = 'android:screenOrientation';

export function getOrientation(config: ExpoConfig) {
  return typeof config.orientation === 'string' ? config.orientation : null;
}

export async function setAndroidOrientation(config: ExpoConfig, manifestDocument: AndroidManifest) {
  const orientation = getOrientation(config);
  if (!orientation) {
    return manifestDocument;
  }

  let mainActivity = getMainActivity(manifestDocument);
  if (!mainActivity) {
    mainActivity = { $: { 'android:name': '.MainActivity' } };
  }
  mainActivity.$[SCREEN_ORIENTATION_ATTRIBUTE] =
    orientation !== 'default' ? orientation : 'unspecified';

  return manifestDocument;
}
