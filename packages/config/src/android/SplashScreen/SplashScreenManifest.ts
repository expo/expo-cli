import { ExpoConfig } from '../../Config.types';
import { Document, getMainActivity } from '../Manifest';
import { getSplashScreenConfig } from './SplashScreenConfig';

export function setSplashScreenManifest(config: ExpoConfig, manifest: Document): Document {
  let mainActivity = getMainActivity(manifest);
  if (!mainActivity) {
    mainActivity = { $: { 'android:name': '.MainActivity' } };
  }
  mainActivity['$']['android:theme'] = getSplashScreenConfig(config)
    ? '@style/Theme.App.SplashScreen'
    : undefined;

  return manifest;
}
