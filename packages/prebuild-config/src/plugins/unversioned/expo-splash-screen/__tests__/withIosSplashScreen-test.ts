import { compileModsAsync, WarningAggregator } from '@expo/config-plugins';
import { ExpoConfig } from '@expo/config-types';
import plist from '@expo/plist';
import * as fs from 'fs';
import { vol } from 'memfs';
import * as path from 'path';

import projectFixtures from '../../../__tests__/fixtures/react-native-project';
import { getDirFromFS } from '../../../icons/__tests__/utils/getDirFromFS';
import {
  buildContentsJsonImages,
  getSplashConfig,
  getSplashStoryboardContentsAsync,
  setSplashInfoPlist,
  warnUnsupportedSplashProperties,
  withIosSplashScreen,
} from '../withIosSplashScreen';

const fsReal = jest.requireActual('fs') as typeof fs;

jest.mock('fs');

afterAll(() => {
  jest.unmock('fs');
});

describe(getSplashStoryboardContentsAsync, () => {
  it(`gets a splash screen without options`, () => {
    const contents = getSplashStoryboardContentsAsync({});
    expect(contents).not.toMatch(/contentMode="scaleAspectFit"/);
  });
  it(`gets a splash screen with image and resize`, () => {
    const contents = getSplashStoryboardContentsAsync({
      image: './my-image.png',
      resizeMode: 'contain',
    });
    // Test the splash screen XML
    expect(contents).toMatch(/contentMode="scaleAspectFit"/);
    expect(contents).toMatch(/id="EXPO-SplashScreen"/);
  });
});

describe(getSplashConfig, () => {
  it(`uses the more specific splash`, () => {
    const config = getSplashConfig({
      slug: '',
      name: '',
      splash: { backgroundColor: 'red', image: 'a' },
      ios: { splash: { image: 'b' } },
    });
    expect(config.image).toBe('b');
    // ensure the background color from the general splash config is not used if the ios splash config is defined.
    expect(config.backgroundColor).toBe('#ffffff');
    expect(config.resizeMode).toBe('contain');
  });
});

describe(setSplashInfoPlist, () => {
  it(`skips warning if dark mode isn't defined`, () => {
    // @ts-ignore: jest
    WarningAggregator.addWarningIOS.mockImplementationOnce();
    const config: ExpoConfig = {
      slug: '',
      name: '',
      userInterfaceStyle: 'light',
      ios: { splash: { image: 'b' } },
    };
    const infoPlist = setSplashInfoPlist(config, {}, {
      userInterfaceStyle: 'light',
      image: 'b',
    } as any);

    // Check if the warning was thrown
    expect(WarningAggregator.addWarningIOS).toHaveBeenCalledTimes(0);

    // Ensure these values are set
    expect(infoPlist.UIUserInterfaceStyle).not.toBeDefined();
    expect(infoPlist.UILaunchStoryboardName).toBe('SplashScreen');
  });
  it(`warns about dark mode conflicts and resets the interface style`, () => {
    // @ts-ignore: jest
    WarningAggregator.addWarningIOS.mockImplementationOnce();

    const config: ExpoConfig = {
      slug: '',
      name: '',
      userInterfaceStyle: 'light',

      ios: { splash: { image: 'b', darkImage: 'v' } },
    };

    const infoPlist = setSplashInfoPlist(config, {}, {
      userInterfaceStyle: 'light',
      image: 'b',
      darkImage: 'v',
    } as any);

    // Check if the warning was thrown
    expect(WarningAggregator.addWarningIOS).toHaveBeenCalledWith(
      'splash',
      'The existing `userInterfaceStyle` property is preventing splash screen from working properly. Please remove it or disable dark mode splash screens.'
    );

    // Ensure these values are set
    expect(infoPlist.UIUserInterfaceStyle).toBe('Automatic');
    expect(infoPlist.UILaunchStoryboardName).toBe('SplashScreen');
  });
});

describe(warnUnsupportedSplashProperties, () => {
  it(`warns about currently unsupported properties`, () => {
    Object.defineProperty(WarningAggregator, 'addWarningIOS', {
      value: jest.fn(),
    });
    const config: ExpoConfig = {
      slug: '',
      name: '',
      //   userInterfaceStyle: 'light',
      ios: {
        splash: {
          xib: './somn',
          userInterfaceStyle: 'light',
          tabletImage: 'tabletImg',
          image: 'b',
        },
      },
    };

    warnUnsupportedSplashProperties(config);

    expect(WarningAggregator.addWarningIOS).toHaveBeenNthCalledWith(
      1,
      'splash',
      'ios.splash.xib is not supported in bare workflow. Please use ios.splash.image instead.'
    );
    expect(WarningAggregator.addWarningIOS).toHaveBeenNthCalledWith(
      2,
      'splash',
      'ios.splash.tabletImage is not supported in bare workflow. Please use ios.splash.image instead.'
    );
    expect(WarningAggregator.addWarningIOS).toHaveBeenNthCalledWith(
      3,
      'splash',
      'ios.splash.userInterfaceStyle is not supported in bare workflow. Please use ios.splash.darkImage (TODO) instead.'
    );
  });
});

describe(buildContentsJsonImages, () => {
  it(`supports dark mode`, () => {
    expect(buildContentsJsonImages({ image: 'somn', darkImage: 'other' }).length).toBe(6);
    expect(buildContentsJsonImages({ image: 'somn', darkImage: null }).length).toBe(3);
  });
});

describe(withIosSplashScreen, () => {
  const iconPath = path.resolve(__dirname, './fixtures/icons/icon.png');
  const icon = fsReal.readFileSync(iconPath, 'utf8');
  const projectRoot = '/app';
  beforeAll(async () => {
    vol.fromJSON(
      {
        ...projectFixtures,
        'assets/splash.png': icon as any,
      },
      projectRoot
    );
  });

  afterAll(() => {
    vol.reset();
  });

  it(`runs entire process`, async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let config: ExpoConfig = {
      name: 'foo',
      slug: 'bar',
    };

    // Apply the splash plugin
    config = withIosSplashScreen(config, {
      // must use full path for mock fs
      image: '/app/assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ff00ff',
      darkImage: '/app/assets/splash.png',
      darkBackgroundColor: '#00ff00',
      userInterfaceStyle: 'automatic',
    });

    // compile all plugins and mods
    config = await compileModsAsync(config, { projectRoot, platforms: ['ios', 'android'] });

    // Test Results

    const infoPlist = await readPlistAsync('/app/ios/ReactNativeProject/Info.plist');
    expect(infoPlist.UILaunchStoryboardName).toBe('SplashScreen');

    const after = getDirFromFS(vol.toJSON(), path.join(projectRoot, 'ios'));

    // Ensure colors are created
    expect(
      after['ReactNativeProject/Images.xcassets/SplashScreenBackground.imageset/image.png']
    ).toMatch(/PNG/);

    expect(
      after['ReactNativeProject/Images.xcassets/SplashScreenBackground.imageset/dark_image.png']
    ).toMatch(/PNG/);

    // Image JSON
    expect(
      after['ReactNativeProject/Images.xcassets/SplashScreenBackground.imageset/Contents.json']
    ).toBeDefined();

    // Ensure images are created
    expect(after['ReactNativeProject/Images.xcassets/SplashScreen.imageset/image.png']).toMatch(
      /PNG/
    );

    expect(
      after['ReactNativeProject/Images.xcassets/SplashScreen.imageset/dark_image.png']
    ).toMatch(/PNG/);

    // Image JSON
    expect(
      after['ReactNativeProject/Images.xcassets/SplashScreen.imageset/Contents.json']
    ).toBeDefined();

    // Test the splash screen XML
    expect(after['ReactNativeProject/SplashScreen.storyboard']).toMatch(
      /contentMode="scaleAspectFit"/
    );
    expect(after['ReactNativeProject/SplashScreen.storyboard']).toMatch(/id="EXPO-SplashScreen"/);
  });
});

function readPlistAsync(plistPath: string) {
  const rawPlist = fs.readFileSync(plistPath, 'utf8');
  return plist.parse(rawPlist);
}
