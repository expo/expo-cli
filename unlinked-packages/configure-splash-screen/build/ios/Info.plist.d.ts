import { SplashScreenStatusBarStyleType } from '../constants';
/**
 * Configures [INFO_PLIST] to show [STORYBOARD] filename as Splash/Launch Screen.
 */
export default function configureInfoPlist(
  iosProjectPath: string,
  config?: {
    statusBar?: {
      hidden?: boolean;
      style?: SplashScreenStatusBarStyleType;
    };
  }
): Promise<void>;
