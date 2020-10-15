/**
 * Deletes all previous splash_screen_images and copies new one to desired drawable directory.
 * If path isn't provided then no new image is placed in drawable directories.
 * @see https://developer.android.com/training/multiscreen/screendensities
 *
 * @param androidMainPath Absolute path to the main directory containing code and resources in Android project. In general that would be `android/app/src/main`.
 */
export default function configureDrawables(
  androidMainPath: string,
  config?: {
    image?: string;
    darkMode?: {
      image?: string;
    };
  }
): Promise<void>;
