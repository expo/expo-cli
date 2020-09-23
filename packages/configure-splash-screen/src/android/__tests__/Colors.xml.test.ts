import * as colorString from 'color-string';
import { vol } from 'memfs';
import { dirname } from 'path';

import configureColorsXml from '../Colors.xml';
import reactNativeProject from './fixtures/react-native-project-structure';

// in `__mocks__/fs.ts` memfs is being used as a mocking library
jest.mock('fs');

describe('Colors.xml', () => {
  describe('configureColorsXml', () => {
    function generateColorsFileContent({
      backgroundColor,
      statusBarColor,
    }: {
      backgroundColor?: string;
      statusBarColor?: string;
    }) {
      return `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <!-- Below line is handled by '@expo/configure-splash-screen' command and it's discouraged to modify it manually -->${
    !backgroundColor
      ? ''
      : `
  <color name="splashscreen_background">${backgroundColor}</color>`
  }${
        !statusBarColor
          ? ''
          : `
  <color name="splashscreen_statusbar_color">${statusBarColor}</color>`
      }
</resources>
`;
    }

    const androidMainPath = '/app/android/app/src/main';
    const filePath = `${androidMainPath}/res/values/colors.xml`;
    const darkFilePath = `${androidMainPath}/res/values-night/colors.xml`;

    beforeEach(() => {
      vol.fromJSON(reactNativeProject, '/app');
    });
    afterEach(() => {
      vol.reset();
    });

    it('creates correct file', async () => {
      await configureColorsXml(androidMainPath, { backgroundColor: colorString.get('red').value });
      const result = vol.readFileSync(filePath, 'utf-8');
      const expected = generateColorsFileContent({ backgroundColor: '#FF0000' });
      expect(result).toEqual(expected);
    });

    it('creates correct file for dark mode', async () => {
      await configureColorsXml(androidMainPath, {
        backgroundColor: colorString.get('red').value,
        darkMode: {
          backgroundColor: colorString.get('green').value,
        },
      });
      const result = vol.readFileSync(darkFilePath, 'utf-8');
      const expected = generateColorsFileContent({ backgroundColor: '#008000' });
      expect(result).toEqual(expected);
    });

    it('updates existing file with correct color', async () => {
      vol.writeFileSync(filePath, generateColorsFileContent({ backgroundColor: '#FFCCAABB' }));
      await configureColorsXml(androidMainPath, {
        backgroundColor: colorString.get('green').value,
      });
      const result = vol.readFileSync(filePath, 'utf-8');
      const expected = generateColorsFileContent({ backgroundColor: '#008000' });
      expect(result).toEqual(expected);
    });

    describe('handles statusBarBackgroundColor', () => {
      it('adds correct color entry', async () => {
        await configureColorsXml(androidMainPath, {
          backgroundColor: colorString.get('rgba(100, 75, 125, 0.5)').value,

          statusBar: { backgroundColor: colorString.get('rgba(120, 85, 155, 0.4)').value },
        });
        const result = vol.readFileSync(filePath, 'utf-8');
        const expected = generateColorsFileContent({
          backgroundColor: '#80644B7D',
          statusBarColor: '#6678559B',
        });
        expect(result).toEqual(expected);
      });
      it('adds correct dark color entry', async () => {
        await configureColorsXml(androidMainPath, {
          backgroundColor: colorString.get('rgba(34, 75, 125, 0.5)').value,
          statusBar: { backgroundColor: colorString.get('rgba(21, 85, 155, 0.8)').value },
          darkMode: {
            statusBar: { backgroundColor: colorString.get('rgba(34, 21, 134, 0.8)').value },
          },
        });
        const darkResult = vol.readFileSync(darkFilePath, 'utf-8');
        const darkExpected = generateColorsFileContent({
          statusBarColor: '#CC221586',
        });
        expect(darkResult).toEqual(darkExpected);
      });
      it(`removes dark file once there's no dark color entry`, async () => {
        vol.mkdirpSync(dirname(darkFilePath));
        vol.writeFileSync(
          darkFilePath,
          generateColorsFileContent({ statusBarColor: '#034567', backgroundColor: '#876421' })
        );
        await configureColorsXml(androidMainPath, {
          backgroundColor: colorString.get('red').value,
        });
        const darkResult = vol.existsSync(darkFilePath);
        expect(darkResult).toEqual(false);
      });
      it('updates colors correctly', async () => {
        vol.mkdirpSync(dirname(darkFilePath));
        vol.writeFileSync(
          darkFilePath,
          generateColorsFileContent({ statusBarColor: '#034567', backgroundColor: '#876421' })
        );
        await configureColorsXml(androidMainPath, {
          backgroundColor: colorString.get('yellow').value,
          darkMode: {
            backgroundColor: colorString.get('rgba(87, 87, 89, 0.2)').value,
            statusBar: { backgroundColor: colorString.get('rgba(56, 124, 58, 1)').value },
          },

          statusBar: { backgroundColor: colorString.get('blue').value },
        });
        const darkResult = vol.readFileSync(darkFilePath, 'utf-8');
        const darkExpected = generateColorsFileContent({
          backgroundColor: '#33575759',
          statusBarColor: '#387C3A',
        });
        expect(darkResult).toEqual(darkExpected);
      });
    });
  });
});
