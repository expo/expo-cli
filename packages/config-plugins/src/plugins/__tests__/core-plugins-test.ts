import { ConfigPlugin, ExportedConfig } from '../../Plugin.types';
import { createRunOncePlugin, withExtendedMod, withPlugins, withRunOnce } from '../core-plugins';
import { evalModsAsync } from '../mod-compiler';

describe(withRunOnce, () => {
  it('runs plugins multiple times without withRunOnce', () => {
    const pluginA: ConfigPlugin = jest.fn(config => config);

    withPlugins({ extra: [] } as any, [
      // Prove unsafe runs as many times as it was added
      pluginA,
      pluginA,
    ]);

    // Unsafe runs multiple times
    expect(pluginA).toBeCalledTimes(2);
  });

  it('prevents running different plugins with same id', () => {
    const pluginA: ConfigPlugin = jest.fn(config => config);
    const pluginB: ConfigPlugin = jest.fn(config => config);

    const pluginId = 'foo';

    const safePluginA = createRunOncePlugin(pluginA, pluginId);
    // A different plugin with the same ID as (A), this proves
    // that different plugins can be prevented when using the same ID.
    const safePluginB = createRunOncePlugin(pluginB, pluginId);

    withPlugins({ extra: [] } as any, [
      // Run plugin twice
      safePluginA,
      safePluginB,
    ]);

    // Prove that each plugin is only run once
    expect(pluginA).toBeCalledTimes(1);
    expect(pluginB).toBeCalledTimes(0);
  });

  it('prevents running the same plugin twice', () => {
    const pluginA: ConfigPlugin = jest.fn(config => config);
    const pluginId = 'foo';

    const safePluginA = createRunOncePlugin(pluginA, pluginId);

    withPlugins({ extra: [] } as any, [
      // Run plugin twice
      safePluginA,
      safePluginA,
    ]);

    // Prove that each plugin is only run once
    expect(pluginA).toBeCalledTimes(1);
  });
});

describe(withPlugins, () => {
  it('compiles plugins in the correct order', () => {
    const pluginA: ConfigPlugin = config => {
      config.extra.push('alpha');
      return config;
    };
    const pluginB: ConfigPlugin<string> = (config, props = 'charlie') => {
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
      platform: 'android',
      mod: 'custom',
      action(props) {
        // Capitalize app name
        props.name = (props.name as string).toUpperCase();
        return props;
      },
    });

    // Compile plugins generically
    config = await evalModsAsync(config, { projectRoot: '/' });

    // Plugins should all be functions
    expect(Object.values(config.mods.android).every(value => typeof value === 'function')).toBe(
      true
    );

    delete config.mods;

    // App config should have been modified
    expect(config).toStrictEqual({
      name: 'APP',
      slug: '',
    });
  });
});
