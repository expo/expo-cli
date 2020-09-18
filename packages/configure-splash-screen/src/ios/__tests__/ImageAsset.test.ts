import { vol } from 'memfs';
import * as path from 'path';

import { readFileFromActualFS } from '../../__tests__/helpers';
import configureImageAsset from '../ImageAsset';
import reactNativeProject from './fixtures/react-native-project-structure';

// in `__mocks__/fs.ts` memfs is being used as a mocking library
jest.mock('fs');

describe('ImageAsset', () => {
  describe('configureImageAsset', () => {
    const backgroundImagePath = path.resolve(__dirname, '../../__tests__/fixtures/background.png');
    const darkBackgroundImagePath = path.resolve(
      __dirname,
      '../../__tests__/fixtures/background_dark.png'
    );
    let backgroundImage: string | Buffer = '';
    let darkBackgroundImage: string | Buffer = '';
    beforeAll(async () => {
      backgroundImage = await readFileFromActualFS(backgroundImagePath);
      darkBackgroundImage = await readFileFromActualFS(darkBackgroundImagePath);
    });

    beforeEach(() => {
      vol.fromJSON(reactNativeProject, '/app');
      vol.mkdirpSync('/assets');
      vol.writeFileSync('/assets/background.png', backgroundImage);
      vol.writeFileSync('/assets/background_dark.png', darkBackgroundImage);
    });
    afterEach(() => {
      vol.reset();
    });

    const iosProjectPath = `/app/ios/ReactNativeProject`;

    it(`creates correct files when there's an image`, async () => {
      await configureImageAsset(iosProjectPath, {
        image: '/assets/background.png',
      });
      const imageResult = vol.readFileSync(
        `${iosProjectPath}/Images.xcassets/SplashScreen.imageset/splashscreen.png`,
        'utf-8'
      );
      const imageSetResult = vol.readFileSync(
        `${iosProjectPath}/Images.xcassets/SplashScreen.imageset/Contents.json`,
        'utf-8'
      );
      expect(imageResult).toEqual(backgroundImage);
      expect(imageSetResult).toEqual(`{
  "images": [
    {
      "idiom": "universal",
      "filename": "splashscreen.png",
      "scale": "1x"
    },
    {
      "idiom": "universal",
      "scale": "2x"
    },
    {
      "idiom": "universal",
      "scale": "3x"
    }
  ],
  "info": {
    "version": 1,
    "author": "xcode"
  }
}`);
    });

    it(`cleans files if there's no image`, async () => {
      await configureImageAsset(iosProjectPath, {
        image: '/assets/background.png',
      });
      await configureImageAsset(iosProjectPath);
      const imageResult = vol.existsSync(
        `${iosProjectPath}/Images.xcassets/SplashScreen.imageset/splashscreen.png`
      );
      const imageSetResult = vol.existsSync(
        `${iosProjectPath}/Images.xcassets/SplashScreen.imageset/Contents.json`
      );
      expect(imageResult).toEqual(false);
      expect(imageSetResult).toEqual(false);
    });

    it(`creates per-appearance files while dark mode is enabled`, async () => {
      await configureImageAsset(iosProjectPath, {
        image: '/assets/background.png',
        darkMode: {
          image: '/assets/background_dark.png',
        },
      });

      const imageResult = vol.readFileSync(
        `${iosProjectPath}/Images.xcassets/SplashScreen.imageset/splashscreen.png`,
        'utf-8'
      );
      const darkImageResult = vol.readFileSync(
        `${iosProjectPath}/Images.xcassets/SplashScreen.imageset/dark_splashscreen.png`,
        'utf-8'
      );
      const imageSetResult = vol.readFileSync(
        `${iosProjectPath}/Images.xcassets/SplashScreen.imageset/Contents.json`,
        'utf-8'
      );
      expect(imageResult).toEqual(backgroundImage);
      expect(darkImageResult).toEqual(darkBackgroundImage);
      expect(imageSetResult).toEqual(`{
  "images": [
    {
      "idiom": "universal",
      "filename": "splashscreen.png",
      "scale": "1x"
    },
    {
      "appearances": [
        {
          "appearance": "luminosity",
          "value": "dark"
        }
      ],
      "idiom": "universal",
      "filename": "dark_splashscreen.png",
      "scale": "1x"
    },
    {
      "idiom": "universal",
      "scale": "2x"
    },
    {
      "appearances": [
        {
          "appearance": "luminosity",
          "value": "dark"
        }
      ],
      "idiom": "universal",
      "scale": "2x"
    },
    {
      "idiom": "universal",
      "scale": "3x"
    },
    {
      "appearances": [
        {
          "appearance": "luminosity",
          "value": "dark"
        }
      ],
      "idiom": "universal",
      "scale": "3x"
    }
  ],
  "info": {
    "version": 1,
    "author": "xcode"
  }
}`);
    });
  });
});
