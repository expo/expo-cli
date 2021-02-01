import colorString from 'color-string';
import { vol } from 'memfs';

import { getPng1x1FileContent } from '../../__tests__/helpers';
import configureBackgroundAsset from '../BackgroundAsset';
import reactNativeProject from './fixtures/react-native-project-structure';

// in `__mocks__/fs.ts` memfs is being used as a mocking library
jest.mock('fs');

describe('BackgrooundAsset', () => {
  describe('configureBackgroundAsset', () => {
    beforeEach(() => {
      vol.fromJSON(reactNativeProject, '/app');
    });
    afterEach(() => {
      vol.reset();
    });

    const iosProjectPath = `/app/ios/ReactNativeProject`;

    it(`creates correct files for given color`, async () => {
      await configureBackgroundAsset(iosProjectPath, {
        backgroundColor: colorString.get('#F2389C').value,
      });
      const imageResult = vol.readFileSync(
        `${iosProjectPath}/Images.xcassets/SplashScreenBackground.imageset/background.png`,
        'utf-8'
      );
      const imageSetResult = vol.readFileSync(
        `${iosProjectPath}/Images.xcassets/SplashScreenBackground.imageset/Contents.json`,
        'utf-8'
      );
      expect(imageResult).toEqual(await getPng1x1FileContent('#F2389C'));
      expect(imageSetResult).toEqual(`{
  "images": [
    {
      "idiom": "universal",
      "filename": "background.png",
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

    it(`updates color files`, async () => {
      await configureBackgroundAsset(iosProjectPath, {
        backgroundColor: colorString.get('#F2389C').value,
      });
      await configureBackgroundAsset(iosProjectPath, {
        backgroundColor: colorString.get('#2F8825').value,
      });
      const imageResult = vol.readFileSync(
        `${iosProjectPath}/Images.xcassets/SplashScreenBackground.imageset/background.png`,
        'utf-8'
      );
      expect(imageResult).toEqual(await getPng1x1FileContent('#2F8825'));
    });

    it(`creates per-appearance files while dark mode is enabled`, async () => {
      await configureBackgroundAsset(iosProjectPath, {
        backgroundColor: colorString.get('#FEFEFE').value,
        darkMode: { backgroundColor: colorString.get('#0E0E0E').value },
      });

      const imageResult = vol.readFileSync(
        `${iosProjectPath}/Images.xcassets/SplashScreenBackground.imageset/background.png`,
        'utf-8'
      );
      const darkImageResult = vol.readFileSync(
        `${iosProjectPath}/Images.xcassets/SplashScreenBackground.imageset/dark_background.png`,
        'utf-8'
      );
      const imageSetResult = vol.readFileSync(
        `${iosProjectPath}/Images.xcassets/SplashScreenBackground.imageset/Contents.json`,
        'utf-8'
      );
      expect(imageResult).toEqual(await getPng1x1FileContent('#FEFEFE'));
      expect(darkImageResult).toEqual(await getPng1x1FileContent('#0E0E0E'));
      expect(imageSetResult).toEqual(`{
  "images": [
    {
      "idiom": "universal",
      "filename": "background.png",
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
      "filename": "dark_background.png",
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
