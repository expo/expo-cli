/**
 * Creates imageset containing image for Splash/Launch Screen.
 */
export default function configureImageAssets(
  iosProjectPath: string,
  config?: {
    image?: string;
    darkMode?: {
      image?: string;
    };
  }
): Promise<void>;
