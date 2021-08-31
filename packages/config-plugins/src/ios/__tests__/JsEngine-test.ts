import type { ExpoConfig } from '@expo/config-types';

import { DEFAULT_JS_ENGINE, getJsEngine, JS_ENGINE_PROP_KEY, setJsEngine } from '../JsEngine';

describe('jsEngine', () => {
  it('returns default engine if no engine is provided', () => {
    const config: Partial<ExpoConfig> = {};
    expect(getJsEngine(config)).toBe(DEFAULT_JS_ENGINE);
  });

  it('return the engine if provided', () => {
    const config: Partial<ExpoConfig> = { ios: { jsEngine: 'jsc' } };
    expect(getJsEngine(config)).toBe('jsc');
  });

  it('return the engine where platform override config has higher priority', () => {
    const config: Partial<ExpoConfig> = { jsEngine: 'hermes', ios: { jsEngine: 'jsc' } };
    expect(getJsEngine(config)).toBe('jsc');
  });

  it('set the property from shared `jsEngine` config', () => {
    const config: Partial<ExpoConfig> = { jsEngine: 'hermes' };
    const podfileProperties = {};

    expect(setJsEngine(config, podfileProperties)).toMatchObject({
      [JS_ENGINE_PROP_KEY]: 'hermes',
    });
  });

  it('set the property from platform `jsEngine` override config', () => {
    const config: Partial<ExpoConfig> = { jsEngine: 'hermes', ios: { jsEngine: 'jsc' } };
    const podfileProperties = {};

    expect(setJsEngine(config, podfileProperties)).toMatchObject({
      [JS_ENGINE_PROP_KEY]: 'jsc',
    });
  });

  it('overwrite the property if an old property is existed', () => {
    const config: Partial<ExpoConfig> = { jsEngine: 'hermes' };
    const podfileProperties = { [JS_ENGINE_PROP_KEY]: 'jsc' };

    expect(setJsEngine(config, podfileProperties)).toMatchObject({
      [JS_ENGINE_PROP_KEY]: 'hermes',
    });
  });
});
