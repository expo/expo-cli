import { vol } from 'memfs';

import { SplashScreenImageResizeMode, SplashScreenImageResizeModeType } from '../../constants';
import configureStringsXml from '../Strings.xml';
import reactNativeProject from './fixtures/react-native-project-structure';

// in `__mocks__/fs.ts` memfs is being used as a mocking library
jest.mock('fs');

describe('Strings.xml', () => {
  describe('configureStringsXml', () => {
    function generateStringsFileContent({
      imageResizeMode,
      statusBarTranslucent,
    }: {
      imageResizeMode?: SplashScreenImageResizeModeType;
      statusBarTranslucent?: boolean;
    }) {
      return `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <!-- Below line is handled by '@expo/configure-splash-screen' command and it's discouraged to modify it manually -->
  ${
    imageResizeMode == null
      ? ''
      : `<string name="expo_splash_screen_resize_mode" translatable="false">${
          imageResizeMode ?? 'contain'
        }</string>`
  }${
        statusBarTranslucent == null
          ? ''
          : `
  <string name="expo_splash_screen_status_bar_translucent" translatable="false">${String(
    statusBarTranslucent
  )}</string>`
      }
</resources>
`;
    }

    const androidMainPath = '/app/android/app/src/main';
    const filePath = `${androidMainPath}/res/values/strings.xml`;

    beforeEach(() => {
      vol.fromJSON(reactNativeProject, '/app');
    });
    afterEach(() => {
      vol.reset();
    });

    it('creates new strings.xml file if not existed', async () => {
      vol.reset();
      await configureStringsXml(androidMainPath, {
        imageResizeMode: SplashScreenImageResizeMode.COVER,
      });
      const result = vol.readFileSync(filePath, 'utf-8');
      const expected = generateStringsFileContent({
        imageResizeMode: SplashScreenImageResizeMode.COVER,
      });
      expect(result).toEqual(expected);
    });

    it('updates not configured string.xml file', async () => {
      vol.writeFileSync(filePath, generateStringsFileContent({}));
      await configureStringsXml(androidMainPath, {
        imageResizeMode: SplashScreenImageResizeMode.CONTAIN,
      });
      const result = vol.readFileSync(filePath, 'utf-8');
      const expected = generateStringsFileContent({
        imageResizeMode: SplashScreenImageResizeMode.CONTAIN,
      });
      expect(result).toEqual(expected);
    });

    it('updates existing string.xml file and override to updated config', async () => {
      vol.writeFileSync(
        filePath,
        generateStringsFileContent({ imageResizeMode: SplashScreenImageResizeMode.CONTAIN })
      );
      await configureStringsXml(androidMainPath, {
        imageResizeMode: SplashScreenImageResizeMode.NATIVE,
        statusBar: {
          translucent: true,
        },
      });
      const result = vol.readFileSync(filePath, 'utf-8');
      const expected = generateStringsFileContent({
        imageResizeMode: SplashScreenImageResizeMode.NATIVE,
        statusBarTranslucent: true,
      });
      expect(result).toEqual(expected);
    });
  });
});
