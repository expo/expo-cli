import { ExportedConfig } from '../../Plugin.types';
import { evalModsAsync } from '../mod-compiler';
import { withBaseMod, withMod } from '../withMod';

describe(withMod, () => {
  it('compiles mods', async () => {
    // A basic plugin exported from an app.json
    const exportedConfig: ExportedConfig = { name: 'app', slug: '', mods: null };

    // Apply mod
    let config = withBaseMod<any>(exportedConfig, {
      platform: 'android',
      mod: 'custom',
      isProvider: true,
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
