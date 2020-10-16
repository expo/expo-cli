import fs from 'fs-extra';
import { vol } from 'memfs';

import { ExportedConfig } from '../../Config.types';
import { withExpoIOSPlugins } from '../expo-plugins';
import { compileModifiersAsync } from '../plugin-compiler';
import rnFixture from './fixtures/react-native-project';

jest.mock('fs');

describe(withExpoIOSPlugins, () => {
  const projectRoot = '/app';
  beforeEach(async () => {
    // Trick XDL Info.plist reading
    Object.defineProperty(process, 'platform', {
      value: 'not-darwin',
    });
    vol.fromJSON(rnFixture, projectRoot);
  });

  afterEach(() => {
    vol.reset();
  });

  it('prefers named keys over info.plist overrides', async () => {
    let config: ExportedConfig = {
      expo: {
        name: 'app',
        slug: '',
        ios: {
          config: {
            usesNonExemptEncryption: false,
          },
          infoPlist: {
            ITSAppUsesNonExemptEncryption: true,
          },
        },
      },
    };

    config = withExpoIOSPlugins(config, {
      bundleIdentifier: 'com.bacon.todo',
      expoUsername: 'bacon',
    });
    // Apply modifier
    config = await compileModifiersAsync('/app', config);
    // This should be false because ios.config.usesNonExemptEncryption is used in favor of ios.infoPlist.ITSAppUsesNonExemptEncryption
    expect(config.expo.ios?.infoPlist?.ITSAppUsesNonExemptEncryption).toBe(false);
  });

  it('compiles modifiers', async () => {
    let config: ExportedConfig = {
      expo: {
        name: 'app',
        slug: '',
        ios: {
          config: {
            usesNonExemptEncryption: true,
            branch: {
              apiKey: 'MY_BRANCH_KEY',
            },
            googleSignIn: {
              reservedClientId: 'GOOGLE_SIGN_IN_CLIENT_ID',
            },
          },
        },
      },
      modifiers: null,
    };

    config = withExpoIOSPlugins(config, {
      bundleIdentifier: 'com.bacon.todo',
      expoUsername: 'bacon',
    });

    // Apply modifier
    config = await compileModifiersAsync('/app', config);

    // App config should have been modified
    expect(config.expo.name).toBe('app');
    expect(config.expo.ios.infoPlist).toBeDefined();
    expect(config.expo.ios.entitlements).toBeDefined();
    // Google Sign In
    expect(
      config.expo.ios?.infoPlist?.CFBundleURLTypes?.find(({ CFBundleURLSchemes }) =>
        CFBundleURLSchemes.includes('GOOGLE_SIGN_IN_CLIENT_ID')
      )
    ).toBeDefined();
    // Branch
    expect(config.expo.ios?.infoPlist?.branch_key?.live).toBe('MY_BRANCH_KEY');

    // Shape
    expect(config.expo).toStrictEqual({});

    // Modifiers should all be functions
    expect(Object.values(config.modifiers.ios).every(value => typeof value === 'function')).toBe(
      true
    );

    // Test that the actual file was rewritten.
    const data = await fs.readFile('/app/ios/ReactNativeProject/Info.plist', 'utf8');
    expect(data).toMatch(/com.bacon.todo/);
  });
});
