import { ExpoConfig } from '@expo/config-types';

import * as WarningAggregator from '../../WarningAggregator';
import {
  buildContentsJsonImages,
  getSplashConfig,
  setSplashInfoPlist,
  warnUnsupportedSplashProperties,
} from '../SplashScreen';

jest.mock('../../WarningAggregator');

jest.mock('fs');

// jest.mock('../../WarningAggregator', () => ({
//   addWarningIOS: jest.fn(),
// }));

afterAll(() => {
  jest.unmock('fs');
  jest.unmock('../../WarningAggregator');
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
