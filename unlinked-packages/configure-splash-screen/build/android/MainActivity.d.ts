import { SplashScreenImageResizeModeType } from '../constants';
/**
 * Injects specific code to MainActivity that would trigger SplashScreen mounting process.
 */
export default function configureMainActivity(
  projectRootPath: string,
  config?: {
    imageResizeMode?: SplashScreenImageResizeModeType;
    statusBar?: {
      translucent?: boolean;
    };
  }
): Promise<void>;
