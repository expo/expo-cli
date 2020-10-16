import fs from 'fs-extra';
import { vol } from 'memfs';

import { ExportedConfig } from '../../Plugin.types';
import { compileModifiersAsync } from '../modifier-compiler';
import rnFixture from './fixtures/react-native-project';

jest.mock('fs');

describe(compileModifiersAsync, () => {
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

  it('compiles with no modifiers', async () => {
    // A basic plugin exported from an app.json
    const exportedConfig: ExportedConfig = {
      expo: { name: 'app', slug: '' },
      modifiers: null,
    };
    const config = await compileModifiersAsync(exportedConfig, projectRoot);

    expect(config.expo.name).toBe('app');
    expect(config.expo.ios.infoPlist).toBeDefined();
    expect(config.expo.ios.entitlements).toBeDefined();
    expect(Object.values(config.modifiers.ios).every(value => typeof value === 'function')).toBe(
      true
    );
  });

  it('compiles modifiers', async () => {
    // A basic plugin exported from an app.json
    let internalValue = '';
    const exportedConfig: ExportedConfig = {
      expo: { name: 'app', slug: '' },
      modifiers: {
        ios: {
          async infoPlist(config) {
            console.log('INFO: ', config.props);
            // Store the incoming value
            internalValue = config.props.data.CFBundleDevelopmentRegion;
            // Modify the data
            config.props.data.CFBundleDevelopmentRegion =
              'CFBundleDevelopmentRegion-crazy-random-value';
            return config;
          },
        },
      },
    };

    // Apply modifier plugin
    const config = await compileModifiersAsync(exportedConfig, projectRoot);

    expect(internalValue).toBe('en');

    // App config should have been modified
    expect(config.expo.name).toBe('app');
    expect(config.expo.ios.infoPlist).toBeDefined();
    expect(config.expo.ios.entitlements).toBeDefined();

    // Plugins should all be functions
    expect(Object.values(config.modifiers.ios).every(value => typeof value === 'function')).toBe(
      true
    );

    // Test that the actual file was rewritten.
    const data = await fs.readFile('/app/ios/ReactNativeProject/Info.plist', 'utf8');
    expect(data).toMatch(/CFBundleDevelopmentRegion-crazy-random-value/);
  });

  for (const invalid of [[{}], null, 7]) {
    it(`throws on invalid modifier results (${invalid})`, async () => {
      // A basic plugin exported from an app.json
      const exportedConfig: ExportedConfig = {
        expo: { name: 'app', slug: '' },
        modifiers: {
          ios: {
            async infoPlist(config) {
              // Return an invalid config
              return invalid as any;
            },
          },
        },
      };

      // Apply modifier plugin
      await expect(compileModifiersAsync(exportedConfig, projectRoot)).rejects.toThrow(
        /Modifier `modifiers.ios.infoPlist` evaluated to an object that is not a valid project config/
      );
    });
  }
});
