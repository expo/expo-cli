import type { ExpoConfig } from '@expo/config-types';

import { DEFAULT_ENGINE, ENGINE_PROP_KEY, getEngine, setEngine } from '../Engine';
import { parsePropertiesFile } from '../Properties';

describe('engine', () => {
  it('returns default engine if no engine is provided', () => {
    const config: Partial<ExpoConfig> = {};
    expect(getEngine(config)).toBe(DEFAULT_ENGINE);
  });

  it('return the engine if provided', () => {
    const config: Partial<ExpoConfig> = { android: { engine: 'jsc' } };
    expect(getEngine(config)).toBe('jsc');
  });

  it('set the property if no property is existed', () => {
    const config: Partial<ExpoConfig> = { android: { engine: 'hermes' } };
    const gradleProperties = parsePropertiesFile(`
android.useAndroidX=true
android.enableJetifier=true
`);

    expect(setEngine(config, gradleProperties)).toContainEqual({
      type: 'property',
      key: ENGINE_PROP_KEY,
      value: 'hermes',
    });
  });

  it('overwrite the property if an old property is existed', () => {
    const config: Partial<ExpoConfig> = { android: { engine: 'hermes' } };
    const gradleProperties = parsePropertiesFile(`
android.useAndroidX=true
android.enableJetifier=true
expo.jsEngine=jsc
`);

    expect(setEngine(config, gradleProperties)).toContainEqual({
      type: 'property',
      key: ENGINE_PROP_KEY,
      value: 'hermes',
    });
  });
});
