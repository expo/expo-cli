import { ExpoConfig } from '@expo/config-types';
import { vol } from 'memfs';

import { evalModsAsync } from '../../../build/plugins/mod-compiler';
import { withIOSEntitlementsPlistBaseMod, withIOSInfoPlistBaseMod } from '../compiler-plugins';
import { withEntitlementsPlist, withInfoPlist } from '../ios-plugins';

jest.mock('fs');

describe(withIOSEntitlementsPlistBaseMod, () => {
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
    config = withIOSEntitlementsPlistBaseMod(config, { noPersist: true });
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

describe(withIOSInfoPlistBaseMod, () => {
  afterEach(() => {
    vol.reset();
  });

  it(`evaluates in dry run mode`, async () => {
    // Ensure this test runs in a blank file system
    vol.fromJSON({});
    let config: ExpoConfig = { name: 'bacon', slug: 'bacon' };
    config = withInfoPlist(config, config => {
      config.modResults['haha'] = 'bet';
      return config;
    });

    // base mods must be added last
    config = withIOSInfoPlistBaseMod(config, { noPersist: true });
    config = await evalModsAsync(config, { projectRoot: '/', platforms: ['ios'] });

    expect(config.ios?.infoPlist).toStrictEqual({
      haha: 'bet',
    });
    // @ts-ignore: mods are untyped
    expect(config.mods.ios.infoPlist).toBeDefined();

    // Ensure no files were written
    expect(vol.toJSON()).toStrictEqual({});
  });
});
