import { ExpoConfig } from '../../Config.types';
import { Document, getMainActivityXML } from '../Manifest';
import { getSplashConfig } from './SplashConfig';

/**
 * Change the MainActivity's theme (style) to be `Theme.App.SplashScreen`.
 *
 * @param config
 * @param manifest
 */
export function setSplashManifest(config: ExpoConfig, manifest: Document): Document {
  let mainActivity = getMainActivityXML(manifest);
  if (!mainActivity) {
    mainActivity = { $: { 'android:name': '.MainActivity' } };
  }
  mainActivity['$']['android:theme'] = getSplashConfig(config)
    ? '@style/Theme.App.SplashScreen'
    : undefined;

  return manifest;
}
