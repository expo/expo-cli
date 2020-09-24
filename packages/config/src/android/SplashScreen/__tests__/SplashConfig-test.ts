import { getDarkSplashConfig, getSplashConfig } from '../SplashConfig';

describe(getSplashConfig, () => {
  it(`uses the more specific splash`, () => {
    const config = getSplashConfig({
      slug: '',
      name: '',
      splash: { backgroundColor: 'red', image: 'a' },
      android: { splash: { mdpi: 'b' } },
    });
    expect(config.mdpi).toBe('b');
    // ensure the background color from the general splash config is not used if the android splash config is defined.
    expect(config.backgroundColor).toBe(null);
  });
});
describe(getDarkSplashConfig, () => {
  it(`uses the dark config`, () => {
    const config = getDarkSplashConfig({
      slug: '',
      name: '',
      splash: { backgroundColor: 'red', image: 'a' },
      android: { splash: { mdpi: 'b', dark: { image: 'c' } } },
    });
    expect(config.mdpi).toBe('c');
    // ensure the background color from the general splash config is not used if the android splash config is defined.
    expect(config.backgroundColor).toBe(null);
  });
});
