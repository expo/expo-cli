import { vol } from 'memfs';
import * as path from 'path';

import { SplashScreenStatusBarStyle } from '../../constants';
import configureStylesXml from '../Styles.xml';
import reactNativeProject from './fixtures/react-native-project-structure';

// in `__mocks__/fs.ts` memfs is being used as a mocking library
jest.mock('fs');

describe('Styles.xml', () => {
  describe('configureColorsXml', () => {
    function generateStylesFileContent({
      addOtherStyle,
      addOtherAttributes,
      windowFullscreenItemValue,
      windowLightStatusBarItemValue,
      addStatusBarColor,
    }: {
      addOtherStyle?: boolean;
      addOtherAttributes?: boolean;
      windowFullscreenItemValue?: boolean;
      windowLightStatusBarItemValue?: boolean;
      addStatusBarColor?: boolean;
    } = {}) {
      return `<?xml version="1.0" encoding="utf-8"?>
<resources>${
        !addOtherStyle
          ? ''
          : `
  <style name="AppTheme" parent="Theme.AppCompat.Light.NoActionBar">
    <!-- Customize your theme here. -->
    <item name="android:textColor">#000000</item>
  </style>`
      }
  <style name="Theme.App.SplashScreen" parent="AppTheme">
    <!-- Below line is handled by '@expo/configure-splash-screen' command and it's discouraged to modify it manually -->
    <item name="android:windowBackground">@drawable/splashscreen</item>${
      windowFullscreenItemValue === undefined
        ? ''
        : `
    <item name="android:windowFullscreen">${String(windowFullscreenItemValue)}</item>`
    }${
        windowLightStatusBarItemValue === undefined
          ? ''
          : `
    <item name="android:windowLightStatusBar">${String(windowLightStatusBarItemValue)}</item>`
      }${
        !addStatusBarColor
          ? ''
          : `
    <item name="android:statusBarColor">@color/splashscreen_statusbar_color</item>`
      }${
        !addOtherAttributes
          ? ''
          : `
    <item name="android:actionBarSize">10dp</item>
    <item name="android:allowSingleTap">true</item>`
      }
    <!-- Customize your splash screen theme here -->
  </style>
</resources>
`;
    }

    const androidMainPath = '/app/android/app/src/main';
    const filePath = `${androidMainPath}/res/values/styles.xml`;
    const v23FilePath = `${androidMainPath}/res/values-v23/styles.xml`;
    const v23NightFilePath = `${androidMainPath}/res/values-night-v23/styles.xml`;

    beforeEach(() => {
      vol.fromJSON(reactNativeProject, '/app');
    });
    afterEach(() => {
      vol.reset();
    });

    it('creates correct file', async () => {
      vol.unlinkSync(filePath);
      await configureStylesXml(androidMainPath);
      const actual = vol.readFileSync(filePath, 'utf-8');
      const expected = generateStylesFileContent();
      expect(actual).toEqual(expected);
    });

    it('updates existing file', async () => {
      await configureStylesXml(androidMainPath);
      const actual = vol.readFileSync(filePath, 'utf-8');
      const expected = generateStylesFileContent({ addOtherStyle: true });
      expect(actual).toEqual(expected);
    });

    describe('handles statusBarHidden', () => {
      it('adds flag', async () => {
        await configureStylesXml(androidMainPath, {
          statusBar: {
            hidden: true,
          },
        });
        const actual = vol.readFileSync(filePath, 'utf-8');
        const expected = generateStylesFileContent({
          addOtherStyle: true,
          windowFullscreenItemValue: true,
        });
        expect(actual).toEqual(expected);
      });

      it('removes flag', async () => {
        await configureStylesXml(androidMainPath, {
          statusBar: {
            hidden: true,
          },
        });
        await configureStylesXml(androidMainPath);
        const actual = vol.readFileSync(filePath, 'utf-8');
        const expected = generateStylesFileContent({ addOtherStyle: true });
        expect(actual).toEqual(expected);
      });
    });

    describe('handles statusBarStyle', () => {
      it('creates correct regular and v23 files when given statusBarStyle', async () => {
        vol.unlinkSync(filePath);
        await configureStylesXml(androidMainPath, {
          statusBar: {
            style: SplashScreenStatusBarStyle.LIGHT_CONTENT,
          },
        });
        const result = vol.readFileSync(filePath, 'utf-8');
        const v23Result = vol.readFileSync(v23FilePath, 'utf-8');
        const v23NightResult = vol.existsSync(v23NightFilePath);
        const expected = generateStylesFileContent();
        const v23Expected = generateStylesFileContent({ windowLightStatusBarItemValue: false });
        expect(result).toEqual(expected);
        expect(v23Result).toEqual(v23Expected);
        expect(v23NightResult).toEqual(false);
      });

      it('creates correct v23 and v23-night files when given statusBarStyle and darkModeStatusBarStyle', async () => {
        await configureStylesXml(androidMainPath, {
          statusBar: {
            style: SplashScreenStatusBarStyle.LIGHT_CONTENT,
            hidden: true,
          },
          darkMode: {
            statusBar: { style: SplashScreenStatusBarStyle.DARK_CONTENT },
          },
        });
        const v23Result = vol.readFileSync(v23FilePath, 'utf-8');
        const v23NightResult = vol.readFileSync(v23NightFilePath, 'utf-8');
        const v23Expected = generateStylesFileContent({
          windowLightStatusBarItemValue: false,
          windowFullscreenItemValue: true,
        });
        const v23NightExpected = generateStylesFileContent({
          windowLightStatusBarItemValue: true,
          windowFullscreenItemValue: true,
        });
        expect(v23Result).toEqual(v23Expected);
        expect(v23NightResult).toEqual(v23NightExpected);
      });

      it('updates every file according to new configuration', async () => {
        await configureStylesXml(androidMainPath, {
          statusBar: {
            hidden: false,
            style: SplashScreenStatusBarStyle.LIGHT_CONTENT,
          },
          darkMode: {
            statusBar: { style: SplashScreenStatusBarStyle.DARK_CONTENT },
          },
        });
        await configureStylesXml(androidMainPath, {
          statusBar: {
            style: SplashScreenStatusBarStyle.DARK_CONTENT,
          },
          darkMode: {
            statusBar: { style: SplashScreenStatusBarStyle.LIGHT_CONTENT },
          },
        });
        const result = vol.readFileSync(filePath, 'utf-8');
        const v23Result = vol.readFileSync(v23FilePath, 'utf-8');
        const v23NightResult = vol.readFileSync(v23NightFilePath, 'utf-8');
        const expected = generateStylesFileContent({ addOtherStyle: true });
        const v23Expected = generateStylesFileContent({ windowLightStatusBarItemValue: true });
        const v23NightExpected = generateStylesFileContent({
          windowLightStatusBarItemValue: false,
        });
        expect(result).toEqual(expected);
        expect(v23Result).toEqual(v23Expected);
        expect(v23NightResult).toEqual(v23NightExpected);
      });

      it(`removes v23-night when it's semantically equal to v23 one`, async () => {
        vol.mkdirpSync(path.dirname(v23FilePath));
        vol.mkdirpSync(path.dirname(v23NightFilePath));
        vol.writeFileSync(
          v23FilePath,
          generateStylesFileContent({
            windowFullscreenItemValue: true,
            windowLightStatusBarItemValue: true,
          })
        );
        vol.writeFileSync(
          v23NightFilePath,
          generateStylesFileContent({
            windowFullscreenItemValue: true,
            windowLightStatusBarItemValue: false,
          })
        );
        await configureStylesXml(androidMainPath, {
          statusBar: {
            style: SplashScreenStatusBarStyle.DARK_CONTENT,
          },
        });
        const v23NightResult = vol.existsSync(v23NightFilePath);
        expect(v23NightResult).toEqual(false);
      });

      it('removes all v23 files upon StatusBarStyle.DEFAULT', async () => {
        vol.mkdirpSync(path.dirname(v23FilePath));
        vol.mkdirpSync(path.dirname(v23NightFilePath));
        vol.writeFileSync(
          v23FilePath,
          generateStylesFileContent({
            windowFullscreenItemValue: true,
            windowLightStatusBarItemValue: true,
          })
        );
        vol.writeFileSync(
          v23NightFilePath,
          generateStylesFileContent({
            windowLightStatusBarItemValue: true,
            windowFullscreenItemValue: false,
          })
        );
        await configureStylesXml(androidMainPath, {
          statusBar: {
            hidden: true,
            style: SplashScreenStatusBarStyle.DEFAULT,
          },
        });
        const v23Result = vol.existsSync(v23FilePath);
        const v23NightResult = vol.existsSync(v23NightFilePath);
        expect(v23Result).toEqual(false);
        expect(v23NightResult).toEqual(false);
      });

      it('creates correct v23 and v23-night files with more specific configuration than the regular one', async () => {
        vol.writeFileSync(
          filePath,
          generateStylesFileContent({
            windowFullscreenItemValue: true,
            addOtherStyle: true,
            addOtherAttributes: true,
          })
        );
        await configureStylesXml(androidMainPath, {
          statusBar: {
            style: SplashScreenStatusBarStyle.DARK_CONTENT,
          },
          darkMode: {
            statusBar: { style: SplashScreenStatusBarStyle.LIGHT_CONTENT },
          },
        });
        const result = vol.readFileSync(filePath, 'utf-8');
        const v23Result = vol.readFileSync(v23FilePath, 'utf-8');
        const v23NightResult = vol.readFileSync(v23NightFilePath, 'utf-8');
        const expected = generateStylesFileContent({
          addOtherStyle: true,
          addOtherAttributes: true,
        });
        const v23Expected = generateStylesFileContent({
          addOtherAttributes: true,
          windowLightStatusBarItemValue: true,
        });
        const v23NightExpected = generateStylesFileContent({
          addOtherAttributes: true,
          windowLightStatusBarItemValue: false,
        });
        expect(result).toEqual(expected);
        expect(v23Result).toEqual(v23Expected);
        expect(v23NightResult).toEqual(v23NightExpected);
      });
    });

    describe('handles statusBarBackgroundColor', () => {
      it('adds statusBarBackgroundColor item to the style config', async () => {
        vol.mkdirpSync(path.dirname(v23FilePath));
        vol.mkdirpSync(path.dirname(v23NightFilePath));
        vol.writeFileSync(
          filePath,
          generateStylesFileContent({
            windowFullscreenItemValue: true,
            addOtherStyle: true,
            addOtherAttributes: true,
          })
        );
        vol.writeFileSync(
          v23FilePath,
          generateStylesFileContent({
            windowFullscreenItemValue: true,
            addOtherAttributes: true,
          })
        );
        vol.writeFileSync(
          v23NightFilePath,
          generateStylesFileContent({
            windowFullscreenItemValue: true,
            addOtherAttributes: true,
          })
        );

        await configureStylesXml(androidMainPath, {
          statusBar: {
            hidden: true,
            style: SplashScreenStatusBarStyle.DARK_CONTENT,
            backgroundColor: [0, 0, 0, 0],
          },
          darkMode: {
            statusBar: { style: SplashScreenStatusBarStyle.LIGHT_CONTENT },
          },
        });

        const result = vol.readFileSync(filePath, 'utf-8');
        const v23Result = vol.readFileSync(v23FilePath, 'utf-8');
        const v23NightResult = vol.readFileSync(v23NightFilePath, 'utf-8');
        const expected = generateStylesFileContent({
          windowFullscreenItemValue: true,
          addOtherStyle: true,
          addOtherAttributes: true,
          addStatusBarColor: true,
        });
        const v23Expected = generateStylesFileContent({
          windowFullscreenItemValue: true,
          windowLightStatusBarItemValue: true,
          addOtherAttributes: true,
          addStatusBarColor: true,
        });
        const v23NightExpected = generateStylesFileContent({
          windowFullscreenItemValue: true,
          windowLightStatusBarItemValue: false,
          addOtherAttributes: true,
          addStatusBarColor: true,
        });
        expect(result).toEqual(expected);
        expect(v23Result).toEqual(v23Expected);
        expect(v23NightResult).toEqual(v23NightExpected);
      });

      it('removes statusBarBackgroundColor item from the style config', async () => {
        vol.mkdirpSync(path.dirname(v23FilePath));
        vol.mkdirpSync(path.dirname(v23NightFilePath));
        vol.writeFileSync(
          filePath,
          generateStylesFileContent({
            windowFullscreenItemValue: true,
            addOtherStyle: true,
            addOtherAttributes: true,
            addStatusBarColor: true,
          })
        );
        vol.writeFileSync(
          v23FilePath,
          generateStylesFileContent({
            windowFullscreenItemValue: true,
            addOtherAttributes: true,
            addStatusBarColor: true,
          })
        );
        vol.writeFileSync(
          v23NightFilePath,
          generateStylesFileContent({
            windowFullscreenItemValue: true,
            addOtherAttributes: true,
            addStatusBarColor: true,
          })
        );

        await configureStylesXml(androidMainPath, {
          statusBar: {
            hidden: true,
            style: SplashScreenStatusBarStyle.DARK_CONTENT,
          },
          darkMode: {
            statusBar: { style: SplashScreenStatusBarStyle.LIGHT_CONTENT },
          },
        });

        const result = vol.readFileSync(filePath, 'utf-8');
        const v23Result = vol.readFileSync(v23FilePath, 'utf-8');
        const v23NightResult = vol.readFileSync(v23NightFilePath, 'utf-8');
        const expected = generateStylesFileContent({
          windowFullscreenItemValue: true,
          addOtherStyle: true,
          addOtherAttributes: true,
        });
        const v23Expected = generateStylesFileContent({
          windowFullscreenItemValue: true,
          windowLightStatusBarItemValue: true,
          addOtherAttributes: true,
        });
        const v23NightExpected = generateStylesFileContent({
          windowFullscreenItemValue: true,
          windowLightStatusBarItemValue: false,
          addOtherAttributes: true,
        });
        expect(result).toEqual(expected);
        expect(v23Result).toEqual(v23Expected);
        expect(v23NightResult).toEqual(v23NightExpected);
      });
    });
  });
});
