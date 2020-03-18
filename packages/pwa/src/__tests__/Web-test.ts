import * as Web from '../Web';

describe('getChromeIconConfig', () => {
  it(`defaults to android.icon`, () => {
    const config = {
      android: { icon: 'android-icon' },
      icon: 'icon',
    };
    const icon = Web.getChromeIconConfig(config);
    expect(icon.src).toBe(config.android.icon);
  });
  it(`uses icon when android.icon is not defined`, () => {
    const config = {
      android: { icon: undefined },
      icon: 'icon',
    };
    const icon = Web.getChromeIconConfig(config);
    expect(icon.src).toBe(config.icon);
  });
});
describe('getFaviconIconConfig', () => {
  it(`defaults to web.favicon`, () => {
    const config = {
      web: { favicon: 'web-favicon' },
      icon: 'icon',
    };
    const icon = Web.getFaviconIconConfig(config);
    expect(icon.src).toBe(config.web.favicon);
  });
  it(`uses icon when web.favicon is not defined`, () => {
    const config = {
      web: { favicon: undefined },
      icon: 'icon',
    };
    const icon = Web.getFaviconIconConfig(config);
    expect(icon.src).toBe(config.icon);
  });
});
describe('getSafariIconConfig', () => {
  it(`defaults to ios.icon`, () => {
    const config = {
      ios: { icon: 'ios-icon' },
      icon: 'icon',
    };
    const icon = Web.getSafariIconConfig(config);
    expect(icon.src).toBe(config.ios.icon);
  });
  it(`uses icon when ios.icon is not defined`, () => {
    const config = {
      ios: { icon: undefined },
      icon: 'icon',
    };
    const icon = Web.getSafariIconConfig(config);
    expect(icon.src).toBe(config.icon);
  });
});
describe('getSafariStartupImageConfig', () => {
  it(`defaults to web.splash object`, () => {
    const config = {
      web: { splash: { image: 'web-splash' } },
      ios: { splash: { image: 'ios-splash' } },
      splash: { image: 'splash' },
    };
    const icon = Web.getSafariStartupImageConfig(config);
    expect(icon.src).toBe(config.web.splash.image);
  });
  it(`returns null if to web.splash.image is null, and fallbacks are defined`, () => {
    const config = {
      web: { splash: { image: null } },
      ios: { splash: { image: 'ios-splash' } },
      splash: { image: 'splash' },
    };
    const icon = Web.getSafariStartupImageConfig(config);
    expect(icon).toBe(null);
  });
  it(`uses ios.splash when web.splash isn't defined`, () => {
    const config = {
      web: {},
      ios: { splash: { image: 'ios-splash' } },
      splash: { image: 'splash' },
    };
    const icon = Web.getSafariStartupImageConfig(config);
    expect(icon.src).toBe(config.ios.splash.image);
  });
  it(`uses splash when web.splash and ios.splash aren't defined`, () => {
    const config = {
      web: {},
      ios: {},
      splash: { image: 'splash' },
    };
    const icon = Web.getSafariStartupImageConfig(config);
    expect(icon.src).toBe(config.splash.image);
  });
  it(`uses resizeMode and backgroundColor from splash object`, () => {
    const config = {
      web: {},
      ios: {},
      splash: { image: 'splash', resizeMode: 'random', backgroundColor: 'orange' } as any,
    };
    const icon = Web.getSafariStartupImageConfig(config);
    expect(icon.resizeMode).toBe(config.splash.resizeMode);
    expect(icon.backgroundColor).toBe(config.splash.backgroundColor);
    expect(icon.src).toBe(config.splash.image);
  });
});
