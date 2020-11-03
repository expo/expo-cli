import { ExpoConfig } from '../Config.types';
import { AndroidManifest, getMainActivity } from './Manifest';

export const SCREEN_ORIENTATION_ATTRIBUTE = 'android:screenOrientation';

export function getOrientation(config: Pick<ExpoConfig, 'orientation'>) {
  return typeof config.orientation === 'string' ? config.orientation : null;
}

export async function setAndroidOrientation(
  config: Pick<ExpoConfig, 'orientation'>,
  manifest: AndroidManifest
) {
  const orientation = getOrientation(config);
  if (!orientation) {
    return manifest;
  }

  let mainActivity = getMainActivity(manifest);
  if (!mainActivity) {
    mainActivity = { $: { 'android:name': '.MainActivity' } };
  }
  mainActivity.$[SCREEN_ORIENTATION_ATTRIBUTE] =
    orientation !== 'default' ? orientation : 'unspecified';

  return manifest;
}
