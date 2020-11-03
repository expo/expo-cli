import { ExpoConfig } from '../Config.types';
import { createAndroidManifestPlugin } from '../plugins/android-plugins';
import { AndroidManifest, getMainActivity } from './Manifest';

export const SCREEN_ORIENTATION_ATTRIBUTE = 'android:screenOrientation';

export const withOrientation = createAndroidManifestPlugin(setAndroidOrientation);

export function getOrientation(config: ExpoConfig) {
  return typeof config.orientation === 'string' ? config.orientation : null;
}

export function setAndroidOrientation(config: ExpoConfig, manifestDocument: AndroidManifest) {
  const orientation = getOrientation(config);
  if (!orientation) {
    return manifestDocument;
  }

  let mainActivity = getMainActivity(manifestDocument);
  // TODO: assert
  if (!mainActivity) {
    mainActivity = { $: { 'android:name': '.MainActivity' } };
  }
  mainActivity['$'][SCREEN_ORIENTATION_ATTRIBUTE] =
    orientation !== 'default' ? orientation : 'unspecified';

  return manifestDocument;
}
