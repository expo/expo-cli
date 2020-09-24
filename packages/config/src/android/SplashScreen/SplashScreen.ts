import { ExpoConfig } from '../../Config.types';
import { setColorsAsync } from './SplashScreenColors';
import { getSplashScreenConfig } from './SplashScreenConfig';
import { configureDrawables, configureDrawableXMLAsync } from './SplashScreenDrawable';
import { setStylesAsync } from './SplashScreenStyles';

export { configureMainActivity } from './SplashScreenMainActivity';
export { setSplashScreenManifest } from './SplashScreenManifest';

export async function setSplashScreenAsync(config: ExpoConfig, projectRoot: string) {
  const splashConfig = getSplashScreenConfig(config);

  // try {
  if (splashConfig) {
    await Promise.all([
      configureDrawables(splashConfig, projectRoot),
      setColorsAsync(splashConfig, projectRoot),
      configureDrawableXMLAsync(splashConfig, projectRoot),
      setStylesAsync(splashConfig, projectRoot),
    ]);
  }
  // } catch (e) {
  //   addWarningAndroid('splash', e);
  // }
}
