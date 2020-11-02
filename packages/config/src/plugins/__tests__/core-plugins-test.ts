import { ConfigPlugin, ExportedConfig } from '../../Plugin.types';
import { withExtendedMod, withPlugins } from '../core-plugins';
import { evalModsAsync } from '../mod-compiler';

describe(withPlugins, () => {
  it('compiles plugins in the correct order', () => {
    const pluginA: ConfigPlugin = config => {
      config.extra.push('alpha');
      return config;
    };
    const pluginB: ConfigPlugin = (config, props = 'charlie') => {
      config.extra.push('beta', props);
      return config;
    };

    expect(
      withPlugins({ extra: [] } as any, [
        // Standard plugin
        pluginA,
        // Plugin with no properties
        // @ts-ignore: users shouldn't do this.
        [pluginB],
        // Plugin with properties
        [pluginB, 'delta'],
      ])
    ).toStrictEqual({ extra: ['alpha', 'beta', 'charlie', 'beta', 'delta'] });
  });
});

describe(withExtendedMod, () => {
  it('compiles mods', async () => {
    // A basic plugin exported from an app.json
    const exportedConfig: ExportedConfig = { name: 'app', slug: '', mods: null };

    // Apply mod
    let config = withExtendedMod<any>(exportedConfig, {
      // @ts-ignore: unsupported platform
      platform: 'android',
      mod: 'custom',
      action(props) {
        // Capitalize app name
        props.name = (props.name as string).toUpperCase();
        return props;
      },
    });

    // Compile plugins generically
    config = await evalModsAsync(config, '/');

    // Plugins should all be functions
    expect(
      // @ts-ignore: unsupported platform
      Object.values(config.mods.android).every(value => typeof value === 'function')
    ).toBe(true);

    delete config.mods;

    // App config should have been modified
    expect(config).toStrictEqual({
      name: 'APP',
      slug: '',
    });
  });
});
