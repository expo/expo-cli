import { getSetupWarnings } from '../setupWarnings';

describe(getSetupWarnings, () => {
  it(`collects setup warnings`, () => {
    expect(
      getSetupWarnings({
        pkg: {
          dependencies: {
            'expo-alpha': '1.0.0',
            'expo-beta': '^2.0.0',
            'expo-gamma': '~3',
            // shouldn't be included since it isn't part of the defaults
            delta: '4.0.0',
          },
        },
        // auto config plugins for legacy managed support
        autoPlugins: ['expo-alpha', 'expo-beta'],
        // automatically applied config plugin
        appliedPlugins: ['expo-alpha', 'expo-gamma'],
        sdkVersion: '40.0.0',
      })
    ).toStrictEqual({
      // Need to warn that this plugin is required to be applied but wasn't
      'expo-beta': 'https://github.com/expo/expo/tree/master/packages/expo-beta',
    });
  });
  // Test that the legacy warning is still added
  it(`gets the legacy constants warning in SDK 39 and lower`, () => {
    const warnings = getSetupWarnings({
      pkg: {
        dependencies: {
          'expo-constants': '~3',
        },
      },
      // auto config plugins for legacy managed support
      autoPlugins: [],
      // automatically applied config plugin
      appliedPlugins: [],
      sdkVersion: '39.0.0',
    });
    expect(warnings['expo-constants']).toMatch(/is not available in the bare workflow/);
  });
});
