import { ExpoConfig } from '../Config.types';
import { assert } from '../Errors';
import { createAndroidManifestPlugin } from '../plugins/android-plugins';
import { AndroidManifest, getMainActivity } from './Manifest';

export const SCREEN_ORIENTATION_ATTRIBUTE = 'android:screenOrientation';

export const withOrientation = createAndroidManifestPlugin(setAndroidOrientation);

export function getOrientation(config: Pick<ExpoConfig, 'orientation'>) {
  return typeof config.orientation === 'string' ? config.orientation : null;
}

export function setAndroidOrientation(
  config: Pick<ExpoConfig, 'orientation'>,
  androidManifest: AndroidManifest
) {
  const orientation = getOrientation(config);
  // TODO: Remove this
  if (!orientation) {
    return androidManifest;
  }

  const mainActivity = getMainActivity(androidManifest);
  assert(mainActivity, 'AndroidManifest.xml is missing the required MainActivity element');

  mainActivity.$[SCREEN_ORIENTATION_ATTRIBUTE] =
    orientation !== 'default' ? orientation : 'unspecified';

  return androidManifest;
}
