import { Color } from '../SplashScreenConfig';
/**
 * @param androidMainPath Path to the main directory containing code and resources in Android project. In general that would be `android/app/src/main`.
 */
export default function configureColorsXml(
  androidMainPath: string,
  config: {
    backgroundColor: Color;
    statusBar?: {
      backgroundColor?: Color;
    };
    darkMode?: {
      backgroundColor?: Color;
      statusBar?: {
        backgroundColor?: Color;
      };
    };
  }
): Promise<void>;
