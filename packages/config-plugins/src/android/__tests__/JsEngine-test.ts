import type { ExpoConfig } from '@expo/config-types';

import { DEFAULT_JS_ENGINE, getJsEngine, JS_ENGINE_PROP_KEY, setJsEngine } from '../JsEngine';
import { parsePropertiesFile } from '../Properties';

describe('jsEngine', () => {
  it('returns default engine if no engine is provided', () => {
    const config: Partial<ExpoConfig> = {};
    expect(getJsEngine(config)).toBe(DEFAULT_JS_ENGINE);
  });

  it('return the engine if provided', () => {
    const config: Partial<ExpoConfig> = { android: { jsEngine: 'jsc' } };
    expect(getJsEngine(config)).toBe('jsc');
  });

  it('set the property if no property is existed', () => {
    const config: Partial<ExpoConfig> = { android: { jsEngine: 'hermes' } };
    const gradleProperties = parsePropertiesFile(`
android.useAndroidX=true
android.enableJetifier=true
`);

    expect(setJsEngine(config, gradleProperties)).toContainEqual({
      type: 'property',
      key: JS_ENGINE_PROP_KEY,
      value: 'hermes',
    });
  });

  it('overwrite the property if an old property is existed', () => {
    const config: Partial<ExpoConfig> = { android: { jsEngine: 'hermes' } };
    const gradleProperties = parsePropertiesFile(`
android.useAndroidX=true
android.enableJetifier=true
expo.jsEngine=jsc
`);

    expect(setJsEngine(config, gradleProperties)).toContainEqual({
      type: 'property',
      key: JS_ENGINE_PROP_KEY,
      value: 'hermes',
    });
  });
});
