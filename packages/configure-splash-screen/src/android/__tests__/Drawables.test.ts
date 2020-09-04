import { vol } from 'memfs';
import * as path from 'path';

import { getDirFromFS, readFileFromActualFS } from '../../__tests__/helpers';
import configureDrawables from '../Drawables';
import reactNativeProject from './fixtures/react-native-project-structure';

// in `__mocks__/fs.ts` memfs is being used as a mocking library
jest.mock('fs');

describe('Drawables', () => {
  describe('configureDrawables', () => {
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

    const androidMainPath = '/app/android/app/src/main';
    const filePath = `${androidMainPath}/res/drawable/splashscreen_image.png`;
    const filePathDarkMode = `${androidMainPath}/res/drawable-night/splashscreen_image.png`;

    it('creates correct file', async () => {
      await configureDrawables(androidMainPath, {
        image: '/assets/background.png',
      });
      const received = getDirFromFS(vol.toJSON(), '/app');
      const expected = {
        ...reactNativeProject,
        [filePath.replace('/app/', '')]: backgroundImage,
      };
      expect(received).toEqual(expected);
    });

    it('creates correct file for dark mode', async () => {
      await configureDrawables(androidMainPath, {
        image: '/assets/background.png',
        darkMode: { image: '/assets/background.png' },
      });
      const received = getDirFromFS(vol.toJSON(), '/app');
      const expected = {
        ...reactNativeProject,
        [filePath.replace('/app/', '')]: backgroundImage,
        [filePathDarkMode.replace('/app/', '')]: backgroundImage,
      };
      expect(received).toEqual(expected);
    });

    it('removes all SplashScreen images', async () => {
      for (const dir of [
        'drawable',
        'drawable-mdpi',
        'drawable-hdpi',
        'drawable-xhdpi',
        'drawable-xxhdpi',
        'drawable-xxxhdpi',
        'drawable-night',
        'drawable-night-mdpi',
        'drawable-night-hdpi',
        'drawable-night-xhdpi',
        'drawable-night-xxhdpi',
        'drawable-night-xxxhdpi',
      ]) {
        const filePath = path.resolve(androidMainPath, 'res', dir, 'splashscreen_image.png');
        vol.mkdirpSync(path.dirname(filePath));
        vol.writeFileSync(filePath, backgroundImage);
      }
      await configureDrawables(androidMainPath, {
        image: '/assets/background.png',
      });
      const received = getDirFromFS(vol.toJSON(), '/app');
      const expected = {
        ...reactNativeProject,
        [filePath.replace('/app/', '')]: backgroundImage,
      };
      expect(received).toEqual(expected);
    });
  });
});
