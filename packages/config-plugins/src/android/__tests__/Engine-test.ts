import type { ExpoConfig } from '@expo/config-types';

import { DEFAULT_ENGINE, getEngine, GRADLE_PROP_KEY, setEngine } from '../Engine';
import { parsePropertiesFile } from '../Properties';

describe('engine', () => {
  it('returns default engine if no engine is provided', () => {
    const config: Partial<ExpoConfig> = {};
    expect(getEngine(config)).toBe(DEFAULT_ENGINE);
  });

  it('return the engine if provided', () => {
    const config: Partial<ExpoConfig> = { android: { engine: 'javascriptcore' } };
    expect(getEngine(config)).toBe('javascriptcore');
  });

  it('set the property if no property is existed', () => {
    const config: Partial<ExpoConfig> = { android: { engine: 'hermes' } };
    const gradleProperties = parsePropertiesFile(`
android.useAndroidX=true
android.enableJetifier=true
`);

    expect(setEngine(config, gradleProperties)).toContainEqual({
      type: 'property',
      key: GRADLE_PROP_KEY,
      value: 'hermes',
    });
  });

  it('overwrite the property if an old property is existed', () => {
    const config: Partial<ExpoConfig> = { android: { engine: 'hermes' } };
    const gradleProperties = parsePropertiesFile(`
android.useAndroidX=true
android.enableJetifier=true
expo.jsEngine=javascriptcore
`);

    expect(setEngine(config, gradleProperties)).toContainEqual({
      type: 'property',
      key: GRADLE_PROP_KEY,
      value: 'hermes',
    });
  });
});
