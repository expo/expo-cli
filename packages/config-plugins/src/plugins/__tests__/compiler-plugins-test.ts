import { ExpoConfig } from '@expo/config-types';
import { vol } from 'memfs';

import { evalModsAsync } from '../../../build/plugins/mod-compiler';
import { withEntitlementsPlistBaseMod } from '../compiler-plugins';
import { withEntitlementsPlist } from '../ios-plugins';

jest.mock('fs');

describe(withEntitlementsPlistBaseMod, () => {
  afterEach(() => {
    vol.reset();
  });

  it(`evaluates in dry run mode`, async () => {
    // Ensure this test runs in a blank file system
    vol.fromJSON({});
    let config: ExpoConfig = { name: 'bacon', slug: 'bacon' };
    config = withEntitlementsPlist(config, config => {
      config.modResults['haha'] = 'bet';
      return config;
    });

    // base mods must be added last
    config = withEntitlementsPlistBaseMod(config, { dryRun: true });
    config = await evalModsAsync(config, { projectRoot: '/', platforms: ['ios'] });

    expect(config.ios?.entitlements).toStrictEqual({
      'aps-environment': 'development',
      haha: 'bet',
    });
    // @ts-ignore: mods are untyped
    expect(config.mods.ios.entitlements).toBeDefined();

    // Ensure no files were written
    expect(vol.toJSON()).toStrictEqual({});
  });
});
