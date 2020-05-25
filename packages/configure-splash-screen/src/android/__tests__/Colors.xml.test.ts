import * as colorString from 'color-string';
import { vol } from 'memfs';

import configureColorsXml from '../Colors.xml';
import reactNativeProject from './fixtures/react-native-project-structure';

// in `__mocks__/fs.ts` memfs is being used as a mocking library
jest.mock('fs');

describe('Colors.xml', () => {
  describe('configureColorsXml', () => {
    function generateColorsFileContent({ backgroundColor }: { backgroundColor: string }) {
      return `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <!-- Below line is handled by '@expo/configure-splash-screen' command and it's discouraged to modify it manually -->
  <color name="splashscreen_background">${backgroundColor}</color>
</resources>
`;
    }

    const androidMainPath = '/app/android/app/src/main';
    const filePath = `${androidMainPath}/res/values/colors.xml`;
    const filePathDarkMode = `${androidMainPath}/res/values-night/colors.xml`;

    beforeEach(() => {
      vol.fromJSON(reactNativeProject, '/app');
    });
    afterEach(() => {
      vol.reset();
    });

    it('creates correct file', async () => {
      await configureColorsXml(androidMainPath, { backgroundColor: colorString.get('red')! });
      const actual = vol.readFileSync(filePath, 'utf-8');
      const expected = generateColorsFileContent({ backgroundColor: '#FF0000' });
      expect(actual).toEqual(expected);
    });

    it('creates correct file for dark mode', async () => {
      await configureColorsXml(androidMainPath, {
        backgroundColor: colorString.get('red')!,
        darkModeBackgroundColor: colorString.get('green')!,
      });
      const actual = vol.readFileSync(filePathDarkMode, 'utf-8');
      const expected = generateColorsFileContent({ backgroundColor: '#008000' });
      expect(actual).toEqual(expected);
    });

    it('updates existing file with correct color', async () => {
      vol.writeFileSync(filePath, generateColorsFileContent({ backgroundColor: '#FFCCAABB' }));
      await configureColorsXml(androidMainPath, { backgroundColor: colorString.get('green')! });
      const actual = vol.readFileSync(filePath, 'utf-8');
      const expected = generateColorsFileContent({ backgroundColor: '#008000' });
      expect(actual).toEqual(expected);
    });
  });
});
