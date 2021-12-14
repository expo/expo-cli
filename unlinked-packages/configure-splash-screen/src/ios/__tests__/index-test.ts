import { vol } from 'memfs';
import * as path from 'path';

import { getDirFromFS, readFileFromActualFS, getPng1x1FileContent } from '../../__tests__/helpers';
import { SplashScreenImageResizeMode } from '../../constants';
import configureIos from '../index';
import reactNativeProject from './fixtures/react-native-project-structure';
import reactNativeProjectWithSplashScreenConfiured from './fixtures/react-native-project-structure-with-splash-screen-configured';

// in `__mocks__/fs.ts` memfs is being used as a mocking library
jest.mock('fs');
const originalFs = jest.requireActual('fs');
// in `__mocks__/xcode.ts` parsing job for `.pbxproj` is performed synchronously on single tread
jest.mock('xcode');

describe('ios', () => {
  describe('configureIos', () => {
    beforeEach(() => {
      vol.fromJSON(reactNativeProject, '/app');
    });
    afterEach(() => {
      vol.reset();
    });

    it('configures project correctly with defaults', async () => {
      await configureIos('/app', {
        backgroundColor: '#E3F29238',
      });
      const received = getDirFromFS(vol.toJSON(), '/app');
      // I don't compare `.pbxproj` as every time it is filled with new UUIDs
      delete received['ios/ReactNativeProject.xcodeproj/project.pbxproj'];
      const expected = {
        ...reactNativeProjectWithSplashScreenConfiured,
        'ios/ReactNativeProject/Images.xcassets/SplashScreenBackground.imageset/background.png':
          await getPng1x1FileContent('#E3F29238'),
      };
      expect(received).toEqual(expected);
    });

    it('configures project with an image and ResizeMode.COVER', async () => {
      const backgroundImagePath = path.resolve(
        __dirname,
        '../../__tests__/fixtures/background.png'
      );
      const backgroundImage = await readFileFromActualFS(backgroundImagePath);

      vol.fromJSON(reactNativeProjectWithSplashScreenConfiured, '/app');
      vol.mkdirpSync('/assets');
      vol.writeFileSync('/assets/background.png', backgroundImage);
      await configureIos('/app', {
        backgroundColor: 'yellow',
        imageResizeMode: SplashScreenImageResizeMode.COVER,
        image: '/assets/background.png',
      });
      const received = getDirFromFS(vol.toJSON(), '/app');
      // I don't compare `.pbxproj` as every time it is filled with new UUIDs
      delete received['ios/ReactNativeProject.xcodeproj/project.pbxproj'];
      const expected = {
        ...reactNativeProjectWithSplashScreenConfiured,
        'ios/ReactNativeProject/Images.xcassets/SplashScreenBackground.imageset/background.png':
          await getPng1x1FileContent('yellow'),
        'ios/ReactNativeProject/Images.xcassets/SplashScreen.imageset/splashscreen.png':
          backgroundImage,
        'ios/ReactNativeProject/Images.xcassets/SplashScreen.imageset/Contents.json': `{
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
}`,
        'ios/ReactNativeProject/SplashScreen.storyboard':
          reactNativeProjectWithSplashScreenConfiured[
            'ios/ReactNativeProject/SplashScreen.storyboard'
          ]
            .replace(
              /(?<=\/imageView>)/,
              `
              <imageView
                clipsSubviews="YES"
                userInteractionEnabled="NO"
                contentMode="scaleAspectFill"
                horizontalHuggingPriority="251"
                verticalHuggingPriority="251"
                translatesAutoresizingMaskIntoConstraints="NO"
                image="SplashScreen"
                id="EXPO-SplashScreen"
                userLabel="SplashScreen"
              >
                <rect key="frame" x="0.0" y="0.0" width="414" height="736"/>
              </imageView>`
            )
            .replace(
              /(?<=id="jkI-2V-eW5"\/>)/,
              `
              <constraint firstItem="EXPO-SplashScreen" firstAttribute="top" secondItem="EXPO-ContainerView" secondAttribute="top" id="2VS-Uz-0LU"/>
              <constraint firstItem="EXPO-SplashScreen" firstAttribute="leading" secondItem="EXPO-ContainerView" secondAttribute="leading" id="LhH-Ei-DKo"/>
              <constraint firstItem="EXPO-SplashScreen" firstAttribute="trailing" secondItem="EXPO-ContainerView" secondAttribute="trailing" id="I6l-TP-6fn"/>
              <constraint firstItem="EXPO-SplashScreen" firstAttribute="bottom" secondItem="EXPO-ContainerView" secondAttribute="bottom" id="nbp-HC-eaG"/>`
            )
            .replace(
              /(?<=resources>)/,
              `
    <image name="SplashScreen" width="414" height="736"/>`
            ),
      };
      expect(received).toEqual(expected);
    });

    it('configures bare flow project with background color and image', async () => {
      const backgroundImagePath = path.resolve(
        __dirname,
        '../../__tests__/fixtures/background.png'
      );
      const backgroundImage = await readFileFromActualFS(backgroundImagePath);
      vol.fromJSON(
        {
          ...reactNativeProject,
          'ios/ReactNativeProject.xcodeproj/project.pbxproj': originalFs.readFileSync(
            path.join(__dirname, 'fixtures/react-native-init-template-project.pbxproj'),
            'utf-8'
          ),
        },
        '/app'
      );
      vol.mkdirpSync('/assets');
      vol.writeFileSync('/assets/background.png', backgroundImage);

      await configureIos('/app', {
        backgroundColor: 'rgb(30, 120, 80)',
        image: '/assets/background.png',
      });

      const { 'ios/ReactNativeProject.xcodeproj/project.pbxproj': actualPbxproj, ...restActual } =
        getDirFromFS(vol.toJSON(), '/app');
      expect(actualPbxproj).toMatch(
        /[A-F0-9]{24} \/\* SplashScreen\.storyboard in Resources \*\/,/
      );
      expect(actualPbxproj).toMatch(/[A-F0-9]{24} \/\* SplashScreen\.storyboard \*\/,/);
      expect(actualPbxproj).toMatch(
        /[A-F0-9]{24} \/\* SplashScreen\.storyboard \*\/ = {isa = PBXFileReference; name = "SplashScreen\.storyboard"; path = "ReactNativeProject\/SplashScreen\.storyboard"; sourceTree = "<group>"; fileEncoding = 4; lastKnownFileType = file\.storyboard; };/
      );
      expect(actualPbxproj).toMatch(
        /[A-F0-9]{24} \/\* SplashScreen\.storyboard in Resources \*\/ = {isa = PBXBuildFile; fileRef = [A-F0-9]{24} \/\* SplashScreen.storyboard \*\/; };/
      );
      expect(restActual).toMatchSnapshot();
    });
  });
});
