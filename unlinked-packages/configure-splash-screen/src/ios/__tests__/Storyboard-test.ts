import { vol } from 'memfs';
import path from 'path';

import { SplashScreenImageResizeMode } from '../../constants';
import configureStoryboard from '../Storyboard';
import readPbxProject from '../pbxproj';
import reactNativeProject from './fixtures/react-native-project-structure';

// in `__mocks__/fs.ts` memfs is being used as a mocking library
jest.mock('fs');
// in `__mocks__/xcode.ts` parsing job for `.pbxproj` is performed synchronously on single tread
jest.mock('xcode');

describe('Storyboard', () => {
  describe('configureStoryboard', () => {
    beforeEach(() => {
      vol.fromJSON(reactNativeProject, '/app');
    });
    afterEach(() => {
      vol.reset();
    });

    const iosProjectPath = path.resolve(`/app/ios`);
    const filePath = path.resolve('/app/ios/ReactNativeProject/SplashScreen.storyboard');

    it('creates .storyboard file', async () => {
      const iosProject = await readPbxProject(iosProjectPath);
      await configureStoryboard(iosProject);
      const actual = vol.readFileSync(filePath, 'utf-8');
      const expected = `<?xml version="1.0" encoding="UTF-8"?>
<document
  type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB"
  version="3.0"
  toolsVersion="16096"
  targetRuntime="iOS.CocoaTouch"
  propertyAccessControl="none"
  useAutolayout="YES"
  launchScreen="YES"
  useTraitCollections="YES"
  useSafeAreas="YES"
  colorMatched="YES"
  initialViewController="EXPO-VIEWCONTROLLER-1"
>
  <device id="retina5_5" orientation="portrait" appearance="light"/>
  <dependencies>
    <deployment identifier="iOS"/>
    <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="16087"/>
    <capability name="Safe area layout guides" minToolsVersion="9.0"/>
    <capability name="documents saved in the Xcode 8 format" minToolsVersion="8.0"/>
  </dependencies>
  <scenes>
    <!--View Controller-->
    <scene sceneID="EXPO-SCENE-1">
      <objects>
        <viewController
          storyboardIdentifier="SplashScreenViewController"
          id="EXPO-VIEWCONTROLLER-1"
          sceneMemberID="viewController"
        >
          <view
            key="view"
            userInteractionEnabled="NO"
            contentMode="scaleToFill"
            insetsLayoutMarginsFromSafeArea="NO"
            id="EXPO-ContainerView"
            userLabel="ContainerView"
          >
            <rect key="frame" x="0.0" y="0.0" width="414" height="736"/>
            <autoresizingMask key="autoresizingMask" flexibleMaxX="YES" flexibleMaxY="YES"/>
            <subviews>
              <imageView
                userInteractionEnabled="NO"
                contentMode="scaleAspectFill"
                horizontalHuggingPriority="251"
                verticalHuggingPriority="251"
                insetsLayoutMarginsFromSafeArea="NO"
                image="SplashScreenBackground"
                translatesAutoresizingMaskIntoConstraints="NO"
                id="EXPO-SplashScreenBackground"
                userLabel="SplashScreenBackground"
              >
                <rect key="frame" x="0.0" y="0.0" width="414" height="736"/>
              </imageView>
            </subviews>
            <constraints>
              <constraint firstItem="EXPO-SplashScreenBackground" firstAttribute="top" secondItem="EXPO-ContainerView" secondAttribute="top" id="1gX-mQ-vu6"/>
              <constraint firstItem="EXPO-SplashScreenBackground" firstAttribute="leading" secondItem="EXPO-ContainerView" secondAttribute="leading" id="6tX-OG-Sck"/>
              <constraint firstItem="EXPO-SplashScreenBackground" firstAttribute="trailing" secondItem="EXPO-ContainerView" secondAttribute="trailing" id="ABX-8g-7v4"/>
              <constraint firstItem="EXPO-SplashScreenBackground" firstAttribute="bottom" secondItem="EXPO-ContainerView" secondAttribute="bottom" id="jkI-2V-eW5"/>
            </constraints>
            <viewLayoutGuide key="safeArea" id="Rmq-lb-GrQ"/>
          </view>
        </viewController>
        <placeholder placeholderIdentifier="IBFirstResponder" id="EXPO-PLACEHOLDER-1" userLabel="First Responder" sceneMemberID="firstResponder"/>
      </objects>
      <point key="canvasLocation" x="140.625" y="129.4921875"/>
    </scene>
  </scenes>
  <resources>
    <image name="SplashScreenBackground" width="1" height="1"/>
  </resources>
</document>
`;
      expect(actual).toEqual(expected);
    });

    it('updates existing .storyboard file', async () => {
      vol.writeFileSync(
        filePath,
        `<?xml version="1.0" encoding="UTF-8"?>
<document
  type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB"
  version="3.0"
  toolsVersion="16096"
  targetRuntime="iOS.CocoaTouch"
  propertyAccessControl="none"
  useAutolayout="YES"
  launchScreen="YES"
  useTraitCollections="YES"
  useSafeAreas="YES"
  colorMatched="YES"
  initialViewController="EXPO-VIEWCONTROLLER-1"
>
  <device id="retina5_5" orientation="portrait" appearance="light"/>
  <dependencies>
    <deployment identifier="iOS"/>
    <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="16087"/>
    <capability name="Safe area layout guides" minToolsVersion="9.0"/>
    <capability name="documents saved in the Xcode 8 format" minToolsVersion="8.0"/>
  </dependencies>
  <scenes>
    <!--View Controller-->
    <scene sceneID="EXPO-SCENE-1">
      <objects>
        <viewController
          storyboardIdentifier="SplashScreenViewController"
          id="EXPO-VIEWCONTROLLER-1"
          sceneMemberID="viewController"
        >
          <view
            key="view"
            userInteractionEnabled="NO"
            contentMode="scaleToFill"
            insetsLayoutMarginsFromSafeArea="NO"
            id="EXPO-ContainerView"
            userLabel="ContainerView"
          >
            <rect key="frame" x="0.0" y="0.0" width="414" height="736"/>
            <autoresizingMask key="autoresizingMask" flexibleMaxX="YES" flexibleMaxY="YES"/>
            <subviews>
              <imageView
                userInteractionEnabled="NO"
                contentMode="scaleAspectFill"
                horizontalHuggingPriority="251"
                verticalHuggingPriority="251"
                insetsLayoutMarginsFromSafeArea="NO"
                image="SplashScreenBackground"
                translatesAutoresizingMaskIntoConstraints="NO"
                id="EXPO-SplashScreenBackground"
                userLabel="SplashScreenBackground"
              >
                <rect key="frame" x="0.0" y="0.0" width="414" height="736"/>
              </imageView>
            </subviews>
            <constraints>
              <constraint firstItem="EXPO-SplashScreenBackground" firstAttribute="top" secondItem="EXPO-ContainerView" secondAttribute="top" id="1gX-mQ-vu6"/>
              <constraint firstItem="EXPO-SplashScreenBackground" firstAttribute="leading" secondItem="EXPO-ContainerView" secondAttribute="leading" id="6tX-OG-Sck"/>
              <constraint firstItem="EXPO-SplashScreenBackground" firstAttribute="trailing" secondItem="EXPO-ContainerView" secondAttribute="trailing" id="ABX-8g-7v4"/>
              <constraint firstItem="EXPO-SplashScreenBackground" firstAttribute="bottom" secondItem="EXPO-ContainerView" secondAttribute="bottom" id="jkI-2V-eW5"/>
            </constraints>
          </view>
        </viewController>
        <placeholder placeholderIdentifier="IBFirstResponder" id="EXPO-PLACEHOLDER-1" userLabel="First Responder" sceneMemberID="firstResponder"/>
      </objects>
      <point key="canvasLocation" x="140.625" y="129.4921875"/>
    </scene>
  </scenes>
  <resources>
    <image name="SplashScreenBackground" width="1" height="1"/>
  </resources>
</document>
`
      );
      const iosProject = await readPbxProject(iosProjectPath);
      await configureStoryboard(iosProject, {
        imageResizeMode: SplashScreenImageResizeMode.CONTAIN,
        image: './',
      });
      const actual = vol.readFileSync(filePath, 'utf-8');
      const expected = `<?xml version="1.0" encoding="UTF-8"?>
<document
  type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB"
  version="3.0"
  toolsVersion="16096"
  targetRuntime="iOS.CocoaTouch"
  propertyAccessControl="none"
  useAutolayout="YES"
  launchScreen="YES"
  useTraitCollections="YES"
  useSafeAreas="YES"
  colorMatched="YES"
  initialViewController="EXPO-VIEWCONTROLLER-1"
>
  <device id="retina5_5" orientation="portrait" appearance="light"/>
  <dependencies>
    <deployment identifier="iOS"/>
    <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="16087"/>
    <capability name="Safe area layout guides" minToolsVersion="9.0"/>
    <capability name="documents saved in the Xcode 8 format" minToolsVersion="8.0"/>
  </dependencies>
  <scenes>
    <!--View Controller-->
    <scene sceneID="EXPO-SCENE-1">
      <objects>
        <viewController
          storyboardIdentifier="SplashScreenViewController"
          id="EXPO-VIEWCONTROLLER-1"
          sceneMemberID="viewController"
        >
          <view
            key="view"
            userInteractionEnabled="NO"
            contentMode="scaleToFill"
            insetsLayoutMarginsFromSafeArea="NO"
            id="EXPO-ContainerView"
            userLabel="ContainerView"
          >
            <rect key="frame" x="0.0" y="0.0" width="414" height="736"/>
            <autoresizingMask key="autoresizingMask" flexibleMaxX="YES" flexibleMaxY="YES"/>
            <subviews>
              <imageView
                userInteractionEnabled="NO"
                contentMode="scaleAspectFill"
                horizontalHuggingPriority="251"
                verticalHuggingPriority="251"
                insetsLayoutMarginsFromSafeArea="NO"
                image="SplashScreenBackground"
                translatesAutoresizingMaskIntoConstraints="NO"
                id="EXPO-SplashScreenBackground"
                userLabel="SplashScreenBackground"
              >
                <rect key="frame" x="0.0" y="0.0" width="414" height="736"/>
              </imageView>
              <imageView
                clipsSubviews="YES"
                userInteractionEnabled="NO"
                contentMode="scaleAspectFit"
                horizontalHuggingPriority="251"
                verticalHuggingPriority="251"
                translatesAutoresizingMaskIntoConstraints="NO"
                image="SplashScreen"
                id="EXPO-SplashScreen"
                userLabel="SplashScreen"
              >
                <rect key="frame" x="0.0" y="0.0" width="414" height="736"/>
              </imageView>
            </subviews>
            <constraints>
              <constraint firstItem="EXPO-SplashScreenBackground" firstAttribute="top" secondItem="EXPO-ContainerView" secondAttribute="top" id="1gX-mQ-vu6"/>
              <constraint firstItem="EXPO-SplashScreenBackground" firstAttribute="leading" secondItem="EXPO-ContainerView" secondAttribute="leading" id="6tX-OG-Sck"/>
              <constraint firstItem="EXPO-SplashScreenBackground" firstAttribute="trailing" secondItem="EXPO-ContainerView" secondAttribute="trailing" id="ABX-8g-7v4"/>
              <constraint firstItem="EXPO-SplashScreenBackground" firstAttribute="bottom" secondItem="EXPO-ContainerView" secondAttribute="bottom" id="jkI-2V-eW5"/>
              <constraint firstItem="EXPO-SplashScreen" firstAttribute="top" secondItem="EXPO-ContainerView" secondAttribute="top" id="2VS-Uz-0LU"/>
              <constraint firstItem="EXPO-SplashScreen" firstAttribute="leading" secondItem="EXPO-ContainerView" secondAttribute="leading" id="LhH-Ei-DKo"/>
              <constraint firstItem="EXPO-SplashScreen" firstAttribute="trailing" secondItem="EXPO-ContainerView" secondAttribute="trailing" id="I6l-TP-6fn"/>
              <constraint firstItem="EXPO-SplashScreen" firstAttribute="bottom" secondItem="EXPO-ContainerView" secondAttribute="bottom" id="nbp-HC-eaG"/>
            </constraints>
            <viewLayoutGuide key="safeArea" id="Rmq-lb-GrQ"/>
          </view>
        </viewController>
        <placeholder placeholderIdentifier="IBFirstResponder" id="EXPO-PLACEHOLDER-1" userLabel="First Responder" sceneMemberID="firstResponder"/>
      </objects>
      <point key="canvasLocation" x="140.625" y="129.4921875"/>
    </scene>
  </scenes>
  <resources>
    <image name="SplashScreen" width="414" height="736"/>
    <image name="SplashScreenBackground" width="1" height="1"/>
  </resources>
</document>
`;
      expect(actual).toEqual(expected);
    });

    it('throws upon ResizeMode.NATIVE', async () => {
      const iosProject = await readPbxProject(iosProjectPath);
      await expect(async () => {
        await configureStoryboard(iosProject, {
          imageResizeMode: SplashScreenImageResizeMode.NATIVE,
        });
      }).rejects.toThrow();
    });

    it('updates .pbxproj file', async () => {
      const iosProject = await readPbxProject(iosProjectPath);
      const original = iosProject.pbxProject.writeSync();
      await configureStoryboard(iosProject, {
        imageResizeMode: SplashScreenImageResizeMode.COVER,
      });

      const result = iosProject.pbxProject.writeSync();
      expect(result).not.toEqual(original);
      expect(result).toMatch(/Begin PBXBuildFile section(\n|.)*?^.*SplashScreen.*$(\n|.)*?End/m);
      expect(result).toMatch(
        /Begin PBXFileReference section(\n|.)*?^.*SplashScreen.*$(\n|.)*?End/m
      );
      expect(result).toMatch(
        /Begin PBXGroup section(\n|.)*?ReactNativeProject(\n|.)*?^.*SplashScreen.*$(\n|.)*?End/m
      );
      expect(result).toMatch(
        /Begin PBXResourcesBuildPhase section(\n|.)*?Images.xcassets(\n|.)*?^.*SplashScreen.*$(\n|.)*?End/m
      );
    });

    it('consecutive calls does not modify .pbxproj', async () => {
      const iosProject = await readPbxProject(iosProjectPath);
      await configureStoryboard(iosProject, {
        imageResizeMode: SplashScreenImageResizeMode.COVER,
      });
      const afterFirstCall = iosProject.pbxProject.writeSync();
      await configureStoryboard(iosProject, {
        imageResizeMode: SplashScreenImageResizeMode.COVER,
      });
      const afterSecondCall = iosProject.pbxProject.writeSync();
      expect(afterSecondCall).toEqual(afterFirstCall);
    });
  });
});
