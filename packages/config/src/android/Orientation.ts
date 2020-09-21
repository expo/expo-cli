import { ConfigPlugin, ExpoConfig } from '../Config.types';
import { Document, getMainActivity, withManifest } from './Manifest';

export const SCREEN_ORIENTATION_ATTRIBUTE = 'android:screenOrientation';

export function getOrientation(config: ExpoConfig) {
  return typeof config.orientation === 'string' ? config.orientation : null;
}

export const withOrientation: ConfigPlugin = config => {
  return withManifest(config, async props => ({
    ...props,
    data: await setAndroidOrientation(config.expo, props.data),
  }));
};

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
