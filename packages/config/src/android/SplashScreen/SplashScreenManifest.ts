import { ExpoConfig } from '../../Config.types';
import { Document } from '../Manifest';
import { getSplashScreenConfig } from './SplashScreenConfig';

export function setSplashScreenManifest(config: ExpoConfig, manifestDocument: Document): Document {
  const mainActivity = manifestDocument.manifest.application[0].activity.filter(
    (e: any) => e['$']['android:name'] === '.MainActivity'
  )[0];

  mainActivity['$']['android:theme'] = getSplashScreenConfig(config)
    ? '@style/Theme.App.SplashScreen'
    : undefined;

  return manifestDocument;
}
