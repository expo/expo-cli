import { Color } from '../SplashScreenConfig';
/**
 * Creates imageset containing solid color image that is used as a background for Splash Screen.
 */
export default function configureAssets(
  iosProjectPath: string,
  config: {
    backgroundColor: Color;
    darkMode?: {
      backgroundColor?: Color;
    };
  }
): Promise<void>;
