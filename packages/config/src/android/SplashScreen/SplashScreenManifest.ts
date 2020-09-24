import { ExpoConfig } from '../../Config.types';
import { Document, getMainActivityXML } from '../Manifest';
import { getSplashScreenConfig } from './SplashScreenConfig';

export function setSplashScreenManifest(config: ExpoConfig, manifest: Document): Document {
  let mainActivity = getMainActivityXML(manifest);
  if (!mainActivity) {
    mainActivity = { $: { 'android:name': '.MainActivity' } };
  }
  mainActivity['$']['android:theme'] = getSplashScreenConfig(config)
    ? '@style/Theme.App.SplashScreen'
    : undefined;

  return manifest;
}
