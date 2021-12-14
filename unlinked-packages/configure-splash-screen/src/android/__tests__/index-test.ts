import { vol } from 'memfs';
import * as path from 'path';

import { getDirFromFS, readFileFromActualFS } from '../../__tests__/helpers';
import { SplashScreenImageResizeMode } from '../../constants';
import configureAndroid from '../index';
import reactNativeProject from './fixtures/react-native-project-structure';
import reactNativeProjectWithSplashScreenConfigured from './fixtures/react-native-project-structure-with-splash-screen-configured';

// in `__mocks__/fs.ts` memfs is being used as a mocking library
jest.mock('fs');

describe('android', () => {
  describe('configureAndroid', () => {
    const backgroundImagePath = path.resolve(__dirname, '../../__tests__/fixtures/background.png');
    let backgroundImage: string | Buffer = '';

    beforeAll(async () => {
      backgroundImage = await readFileFromActualFS(backgroundImagePath);
    });
    beforeEach(() => {
      vol.fromJSON(reactNativeProject, '/app');
      vol.mkdirpSync('/assets');
      vol.writeFileSync('/assets/background.png', backgroundImage);
    });
    afterEach(() => {
      vol.reset();
    });

    it('configures project correctly with defaults', async () => {
      await configureAndroid('/app', {
        backgroundColor: '#E3F29238',
      });

      const received = getDirFromFS(vol.toJSON(), '/app');
      expect(received).toEqual(reactNativeProjectWithSplashScreenConfigured);
    });

    it('reconfigures project with ResizeMode.NATIVE', async () => {
      vol.fromJSON(reactNativeProjectWithSplashScreenConfigured, '/app');
      await configureAndroid('/app', {
        backgroundColor: 'rgba(35, 123, 217, 0.5)',
        image: '/assets/background.png',
        imageResizeMode: SplashScreenImageResizeMode.NATIVE,
      });
      const received = getDirFromFS(vol.toJSON(), '/app');
      const expected = {
        ...reactNativeProjectWithSplashScreenConfigured,
        'android/app/src/main/res/values/strings.xml': reactNativeProjectWithSplashScreenConfigured[
          'android/app/src/main/res/values/strings.xml'
        ].replace('contain', 'native'),
        'android/app/src/main/res/drawable/splashscreen.xml':
          reactNativeProjectWithSplashScreenConfigured[
            'android/app/src/main/res/drawable/splashscreen.xml'
          ].replace(
            /(?<=<item.*\/>\n)/m,
            '  <item>\n    <bitmap android:gravity="center" android:src="@drawable/splashscreen_image"/>\n  </item>\n'
          ),
        'android/app/src/main/res/values/colors.xml': reactNativeProjectWithSplashScreenConfigured[
          'android/app/src/main/res/values/colors.xml'
        ].replace('#38E3F292', '#80237BD9'),
        'android/app/src/main/res/drawable/splashscreen_image.png': backgroundImage,
      };

      expect(received).toEqual(expected);
    });

    it('configures project with an image and ResizeMode.COVER', async () => {
      vol.fromJSON(reactNativeProjectWithSplashScreenConfigured, '/app');
      vol.mkdirpSync('/assets');
      vol.writeFileSync('/assets/background.png', backgroundImage);
      await configureAndroid('/app', {
        backgroundColor: 'yellow',
        image: '/assets/background.png',
        imageResizeMode: SplashScreenImageResizeMode.COVER,
      });
      const received = getDirFromFS(vol.toJSON(), '/app');
      const expected = {
        ...reactNativeProjectWithSplashScreenConfigured,
        'android/app/src/main/res/values/strings.xml': reactNativeProjectWithSplashScreenConfigured[
          'android/app/src/main/res/values/strings.xml'
        ].replace('contain', 'cover'),
        'android/app/src/main/res/values/colors.xml': reactNativeProjectWithSplashScreenConfigured[
          'android/app/src/main/res/values/colors.xml'
        ].replace('#38E3F292', '#FFFF00'),
        'android/app/src/main/res/drawable/splashscreen_image.png': backgroundImage,
      };
      expect(received).toEqual(expected);
    });

    it('configures project correctly with only different colors for color modes and without images', async () => {
      await configureAndroid('/app', {
        backgroundColor: '#E3F29238',
        darkMode: {
          backgroundColor: '#65E3A2',
        },
      });

      const received = getDirFromFS(vol.toJSON(), '/app');
      const expected = {
        ...reactNativeProjectWithSplashScreenConfigured,
        'android/app/src/main/res/values-night/colors.xml': `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <!-- Below line is handled by '@expo/configure-splash-screen' command and it's discouraged to modify it manually -->
  <color name="splashscreen_background">#65E3A2</color>
</resources>
`,
      };
      expect(received).toEqual(expected);
    });

    it('configures project correctly with different colors and one image for both color modes', async () => {
      await configureAndroid('/app', {
        imageResizeMode: SplashScreenImageResizeMode.CONTAIN,
        image: '/assets/background.png',
        backgroundColor: '#E3F29238',
        darkMode: {
          backgroundColor: '#65E3A2',
        },
      });

      const received = getDirFromFS(vol.toJSON(), '/app');
      const expected = {
        ...reactNativeProjectWithSplashScreenConfigured,
        'android/app/src/main/res/values-night/colors.xml': `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <!-- Below line is handled by '@expo/configure-splash-screen' command and it's discouraged to modify it manually -->
  <color name="splashscreen_background">#65E3A2</color>
</resources>
`,
        'android/app/src/main/res/drawable/splashscreen_image.png': backgroundImage,
      };
      expect(received).toEqual(expected);
    });

    it('configures project correctly with different colors and images for both color modes', async () => {
      const backgroundImageDark = await readFileFromActualFS(
        path.resolve(__dirname, '../../__tests__/fixtures/background_dark.png')
      );
      vol.writeFileSync('/assets/background_dark.png', backgroundImageDark);
      await configureAndroid('/app', {
        imageResizeMode: SplashScreenImageResizeMode.CONTAIN,
        backgroundColor: '#E3F29238',
        image: '/assets/background.png',
        darkMode: {
          backgroundColor: '#65E3A2',
          image: '/assets/background_dark.png',
        },
      });

      const received = getDirFromFS(vol.toJSON(), '/app');
      const expected = {
        ...reactNativeProjectWithSplashScreenConfigured,
        'android/app/src/main/res/values-night/colors.xml': `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <!-- Below line is handled by '@expo/configure-splash-screen' command and it's discouraged to modify it manually -->
  <color name="splashscreen_background">#65E3A2</color>
</resources>
`,
        'android/app/src/main/res/drawable/splashscreen_image.png': backgroundImage,
        'android/app/src/main/res/drawable-night/splashscreen_image.png': backgroundImageDark,
      };
      expect(received).toEqual(expected);
    });
  });
});
