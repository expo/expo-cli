import { vol } from 'memfs';
import path from 'path';

import { readFileFromActualFS } from '../../__tests__/helpers';
import { validateAndroidConfig } from '../index';

// in `__mocks__/fs.ts` memfs is being used as a mocking library
jest.mock('fs');

describe('validateAndroidConfig', () => {
  const backgroundImagePath = path.resolve(__dirname, '../../__tests__/fixtures/background.png');
  let backgroundImage: string | Buffer = '';
  beforeAll(async () => {
    backgroundImage = await readFileFromActualFS(backgroundImagePath);
  });
  beforeEach(() => {
    vol.mkdirpSync('/assets');
    vol.writeFileSync('/assets/background.png', backgroundImage);
  });
  afterEach(() => {
    vol.reset();
  });

  describe('successful scenarios', () => {
    it('validates minimal config successfully', async () => {
      const result = await validateAndroidConfig({
        backgroundColor: 'rgb(120, 240, 20)',
      });
      expect(result).toEqual({
        backgroundColor: [120, 240, 20, 1],
      });
    });

    it('validates full config successfully', async () => {
      const result = await validateAndroidConfig({
        backgroundColor: 'red',
        image: '/assets/background.png',
        imageResizeMode: 'contain',
        statusBar: {
          hidden: false,
          translucent: false,
          style: 'dark-content',
          backgroundColor: 'yellow',
        },
        darkMode: {
          image: '/assets/background.png',
          backgroundColor: 'rgba(40, 80, 120, 0.5)',
          statusBar: {
            backgroundColor: 'hsl(64, 47%, 70%)',
            style: 'light-content',
          },
        },
      });
      expect(result).toEqual({
        backgroundColor: [255, 0, 0, 1],
        darkMode: {
          backgroundColor: [40, 80, 120, 0.5],
          image: path.resolve('/assets/background.png'),
          statusBar: {
            backgroundColor: [64, 47, 70, 1],
            style: 'light-content',
          },
        },
        image: path.resolve('/assets/background.png'),
        imageResizeMode: 'contain',
        statusBar: {
          backgroundColor: [255, 255, 0, 1],
          hidden: false,
          style: 'dark-content',
          translucent: false,
        },
      });
    });
  });

  describe('rejecting scenarios', () => {
    it('rejects on wrong color strings', async () => {
      await expect(async () => {
        await validateAndroidConfig({
          backgroundColor: 'nonexistingnamedcolor',
          statusBar: {
            backgroundColor: '#GGHH123',
          },
          darkMode: {
            backgroundColor: 'rgb(300, -123, 500, 100, 10)',
            statusBar: {
              backgroundColor: 'hsl(2)',
            },
          },
        });
      }).rejects.toThrow(
        new Error(`Validating error:
  'backgroundColor': Invalid value 'nonexistingnamedcolor' - value is not a color string. Provide a valid color string.
  'statusBar.backgroundColor': Invalid value '#GGHH123' - value is not a color string. Provide a valid color string.
  'darkMode.backgroundColor': Invalid value 'rgb(300, -123, 500, 100, 10)' - value is not a color string. Provide a valid color string.
  'darkMode.statusBar.backgroundColor': Missing a required valid value for 'darkMode.backgroundColor'. Provide a valid value for it to enable this property.`)
      );
    });

    it('rejects on wrong image paths', async () => {
      await expect(async () => {
        await validateAndroidConfig({
          backgroundColor: 'white',
          image: '/assets/bg.png',
          darkMode: {
            image: '/assets/bg.png',
          },
        });
      }).rejects.toThrow(
        new Error(`Validating error:
  'image': Invalid path '/assets/bg.png' - file does not exist. Provide a path to an existing file.
  'darkMode.image': Missing a required valid value for 'darkMode.backgroundColor'. Provide a valid value for it to enable this property.`)
      );
    });

    it('rejects on strings', async () => {
      await expect(async () => {
        await validateAndroidConfig({
          backgroundColor: 'white',
          image: '/assets/background.png',
          imageResizeMode: 'unknown',

          statusBar: {
            backgroundColor: 'black',
            style: 'unknown',
          },
          darkMode: {
            backgroundColor: 'rgb(10, 10, 10)',
            statusBar: {
              style: 'unknown',
            },
          },
        });
      }).rejects.toThrow(
        new Error(`Validating error:
  'imageResizeMode': Invalid value 'unknown'. Available values are "contain" | "cover" | "native".
  'statusBar.style': Invalid value 'unknown'. Available values are "default" | "light-content" | "dark-content".
  'darkMode.statusBar.style': Missing a required valid value for 'statusBar.style'. Provide a valid value for it to enable this property.`)
      );
    });
  });
});
