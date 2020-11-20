import { SplashScreenImageResizeModeType } from '../constants';
import { IosProject } from './pbxproj';
/**
 * Creates [STORYBOARD] file containing ui description of Splash/Launch Screen.
 * > WARNING: modifies `pbxproj`
 */
export default function configureStoryboard(
  iosProject: IosProject,
  config?: {
    imageResizeMode?: SplashScreenImageResizeModeType;
    image?: string;
  }
): Promise<void>;
