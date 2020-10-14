import fs from 'fs-extra';
import { vol } from 'memfs';
import * as path from 'path';

import { ConfigPlugin, ExportedConfig } from '../../Config.types';
import { compilePluginsAsync } from '../plugin-compiler';
import rnFixture from './fixtures/react-native-project';
const actualFs = jest.requireActual('fs') as typeof fs;

jest.mock('fs');

describe(compilePluginsAsync, () => {
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

  it('compiles with no plugins', async () => {
    // A basic plugin exported from an app.json
    const exportedConfig: ExportedConfig = {
      expo: { name: 'app', slug: '' },
      plugins: null,
    };
    const config = await compilePluginsAsync('/app', exportedConfig);

    expect(config.expo).toStrictEqual({
      name: 'app',
      slug: '',
    });
    expect(Object.values(config.plugins.ios).every(value => typeof value === 'function')).toBe(
      true
    );
  });

  it('compiles modifier plugins', async () => {
    // A basic plugin exported from an app.json
    let internalValue = '';
    const exportedConfig: ExportedConfig = {
      expo: { name: 'app', slug: '' },
      plugins: {
        ios: {
          async infoPlist(config, props) {
            console.log('INFO: ', props);
            // Store the incoming value
            internalValue = props.data.CFBundleDevelopmentRegion;
            // Modify the data
            props.data.CFBundleDevelopmentRegion = 'CFBundleDevelopmentRegion-crazy-random-value';
            return [config, props];
          },
        },
      },
    };

    // Apply modifier plugin
    const config = await compilePluginsAsync('/app', exportedConfig);

    expect(internalValue).toBe('en');

    // App config should have been modified
    expect(config.expo).toStrictEqual({
      name: 'app',
      slug: '',
    });

    // Plugins should all be functions
    expect(Object.values(config.plugins.ios).every(value => typeof value === 'function')).toBe(
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
        plugins: {
          ios: {
            async infoPlist(config, props) {
              // Return an invalid config
              return invalid as any;
            },
          },
        },
      };

      // Apply modifier plugin
      await expect(compilePluginsAsync('/app', exportedConfig)).rejects.toThrow(
        /Modifier `plugins.ios.infoPlist` evaluated to an object that is not a valid project config/
      );
    });
  }
});
