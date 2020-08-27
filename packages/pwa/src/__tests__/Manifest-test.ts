import * as Manifest from '../Manifest';

describe('createPWAManifestFromWebConfig', () => {
  // Important for ensuring that we keep the manifest minimal
  it(`omits related_applications when none are defined`, () => {
    const config = {
      relatedApplications: [],
      // Even if this is true, we will correct the error by not including it.
      preferRelatedApplications: true,
    };
    const manifest = Manifest.createPWAManifestFromWebConfig(config);
    expect(manifest.prefer_related_applications).not.toBeDefined();
    expect(manifest.related_applications).not.toBeDefined();
  });
  it(`includes related_applications when at least one is defined`, () => {
    const config = {
      relatedApplications: [{}],
      preferRelatedApplications: true,
    };
    const manifest = Manifest.createPWAManifestFromWebConfig(config);
    expect(manifest.prefer_related_applications).toBe(true);
    expect(manifest.related_applications).toBeDefined();
  });
  it(`validates that the object is defined`, () => {
    expect(() => Manifest.createPWAManifestFromWebConfig(null)).toThrow(`must be a valid object`);
  });
});

/**
 * Icons
 */
describe('getChromeIconConfig', () => {
  it(`defaults to android.icon`, () => {
    const config = {
      android: { icon: 'android-icon' },
      icon: 'icon',
    };
    const icon = Manifest.getChromeIconConfig(config);
    expect(icon.src).toBe(config.android.icon);
  });
  it(`uses icon when android.icon is not defined`, () => {
    const config = {
      android: { icon: undefined },
      icon: 'icon',
    };
    const icon = Manifest.getChromeIconConfig(config);
    expect(icon.src).toBe(config.icon);
  });
});
describe('getFaviconIconConfig', () => {
  it(`defaults to web.favicon`, () => {
    const config = {
      web: { favicon: 'web-favicon' },
      icon: 'icon',
    };
    const icon = Manifest.getFaviconIconConfig(config);
    expect(icon.src).toBe(config.web.favicon);
  });
  it(`uses icon when web.favicon is not defined`, () => {
    const config = {
      web: { favicon: undefined },
      icon: 'icon',
    };
    const icon = Manifest.getFaviconIconConfig(config);
    expect(icon.src).toBe(config.icon);
  });
  it(`allow empty favicon with empty string in web.favicon`, () => {
    const config = {
      web: { favicon: '' },
      icon: 'icon',
    };
    const icon = Manifest.getFaviconIconConfig(config);
    expect(icon).toBe(null);
  });
});
describe('getSafariIconConfig', () => {
  it(`defaults to ios.icon`, () => {
    const config = {
      ios: { icon: 'ios-icon' },
      icon: 'icon',
    };
    const icon = Manifest.getSafariIconConfig(config);
    expect(icon.src).toBe(config.ios.icon);
  });
  it(`uses icon when ios.icon is not defined`, () => {
    const config = {
      ios: { icon: undefined },
      icon: 'icon',
    };
    const icon = Manifest.getSafariIconConfig(config);
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
    const icon = Manifest.getSafariStartupImageConfig(config);
    expect(icon.src).toBe(config.web.splash.image);
  });
  it(`returns null if to web.splash.image is null, and fallbacks are defined`, () => {
    const config = {
      web: { splash: { image: null } },
      ios: { splash: { image: 'ios-splash' } },
      splash: { image: 'splash' },
    };
    const icon = Manifest.getSafariStartupImageConfig(config);
    expect(icon).toBe(null);
  });
  it(`uses ios.splash when web.splash isn't defined`, () => {
    const config = {
      web: {},
      ios: { splash: { image: 'ios-splash' } },
      splash: { image: 'splash' },
    };
    const icon = Manifest.getSafariStartupImageConfig(config);
    expect(icon.src).toBe(config.ios.splash.image);
  });
  it(`uses splash when web.splash and ios.splash aren't defined`, () => {
    const config = {
      web: {},
      ios: {},
      splash: { image: 'splash' },
    };
    const icon = Manifest.getSafariStartupImageConfig(config);
    expect(icon.src).toBe(config.splash.image);
  });
  it(`uses resizeMode and backgroundColor from splash object`, () => {
    const config = {
      web: {},
      ios: {},
      splash: { image: 'splash', resizeMode: 'random', backgroundColor: 'orange' } as any,
    };
    const icon = Manifest.getSafariStartupImageConfig(config);
    expect(icon.resizeMode).toBe(config.splash.resizeMode);
    expect(icon.backgroundColor).toBe(config.splash.backgroundColor);
    expect(icon.src).toBe(config.splash.image);
  });
});
