import { vol } from 'memfs';
import * as path from 'path';

import { SplashScreenImageResizeMode } from '../../constants';
import configureDrawableXml from '../Drawable.xml';
import reactNativeProject from './fixtures/react-native-project-structure';

// in `__mocks__/fs.ts` memfs is being used as a mocking library
jest.mock('fs');

describe('Drawable.xml', () => {
  describe('configureDrawableXml', () => {
    function generateDrawableFileContent({ addBitmapItem }: { addBitmapItem?: boolean } = {}) {
      return `<?xml version="1.0" encoding="utf-8"?>
<!--
  This file was created by '@expo/configure-splash-screen' and some of it's content shouldn't be modified by hand
-->
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item android:drawable="@color/splashscreen_background"/>${
    !addBitmapItem
      ? ''
      : `
  <item>
    <bitmap android:gravity="center" android:src="@drawable/splashscreen_image"/>
  </item>`
  }
</layer-list>
`;
    }

    beforeEach(() => {
      vol.fromJSON(reactNativeProject, '/app');
    });
    afterEach(() => {
      vol.reset();
    });

    const androidMainPath = '/app/android/app/src/main';
    const filePath = `${androidMainPath}/res/drawable/splashscreen.xml`;
    const fileDirPath = path.dirname(filePath);

    it('creates correct file', async () => {
      await configureDrawableXml(androidMainPath, {
        imageResizeMode: SplashScreenImageResizeMode.NATIVE,
      });
      const actual = vol.readFileSync(filePath, 'utf-8');
      const expected = generateDrawableFileContent({ addBitmapItem: true });
      expect(actual).toEqual(expected);
    });

    it('updates existing almost empty file', async () => {
      vol.mkdirpSync(fileDirPath);
      vol.writeFileSync(filePath, `<?xml version="1.0" encoding="utf-8"?>`);
      await configureDrawableXml(androidMainPath, {
        imageResizeMode: SplashScreenImageResizeMode.COVER,
      });
      const actual = vol.readFileSync(filePath, 'utf-8');
      const expected = generateDrawableFileContent();
      expect(actual).toEqual(expected);
    });

    it('removes bitmap element if mode is not NATIVE', async () => {
      vol.mkdirpSync(fileDirPath);
      vol.writeFileSync(filePath, generateDrawableFileContent({ addBitmapItem: true }));
      await configureDrawableXml(androidMainPath, {
        imageResizeMode: SplashScreenImageResizeMode.CONTAIN,
      });
      const actual = vol.readFileSync(filePath, 'utf-8');
      const expected = generateDrawableFileContent();
      expect(actual).toEqual(expected);
    });
  });
});
