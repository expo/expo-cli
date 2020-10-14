import { Color } from '../SplashScreenConfig';
import { SplashScreenStatusBarStyleType } from '../constants';
/**
 * @param androidMainPath Path to the main directory containing code and resources in Android project. In general that would be `android/app/src/main`.
 */
export default function configureStylesXml(
  androidMainPath: string,
  config?: {
    statusBar?: {
      style?: SplashScreenStatusBarStyleType;
      hidden?: boolean;
      backgroundColor?: Color;
    };
    darkMode?: {
      statusBar?: {
        style?: SplashScreenStatusBarStyleType;
      };
    };
  }
): Promise<void>;
