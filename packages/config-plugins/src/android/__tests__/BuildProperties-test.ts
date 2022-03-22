import { compileMockModWithResultsAsync } from '../../plugins/__tests__/mockMods';
import { withGradleProperties } from '../../plugins/android-plugins';
import {
  updateAndroidBuildPropertiesFromConfig,
  updateAndroidBuildProperty,
  withJsEngineGradleProps,
} from '../BuildProperties';
import { parsePropertiesFile, PropertiesItem } from '../Properties';

jest.mock('../../plugins/android-plugins');

describe(withJsEngineGradleProps, () => {
  const JS_ENGINE_PROP_KEY = 'expo.jsEngine';

  it('set the property from shared `jsEngine` config', async () => {
    const { modResults } = await compileMockModWithResultsAsync(
      { jsEngine: 'hermes' },
      {
        plugin: withJsEngineGradleProps,
        mod: withGradleProperties,
        modResults: [],
      }
    );
    expect(modResults).toContainEqual({
      type: 'property',
      key: JS_ENGINE_PROP_KEY,
      value: 'hermes',
    });
  });

  it('set the property from platform override `jsEngine`', async () => {
    const { modResults } = await compileMockModWithResultsAsync(
      { jsEngine: 'hermes', android: { jsEngine: 'jsc' } },
      {
        plugin: withJsEngineGradleProps,
        mod: withGradleProperties,
        modResults: [],
      }
    );
    expect(modResults).toContainEqual({
      type: 'property',
      key: JS_ENGINE_PROP_KEY,
      value: 'jsc',
    });
  });

  it('overwrite the property if an old property is existed', async () => {
    const originalGradleProperties = parsePropertiesFile(`
android.useAndroidX=true
android.enableJetifier=true
expo.jsEngine=jsc
`);

    const { modResults } = await compileMockModWithResultsAsync(
      { android: { jsEngine: 'hermes' } },
      {
        plugin: withJsEngineGradleProps,
        mod: withGradleProperties,
        modResults: originalGradleProperties,
      }
    );
    expect(modResults).toContainEqual({
      type: 'property',
      key: JS_ENGINE_PROP_KEY,
      value: 'hermes',
    });
  });
});

describe(updateAndroidBuildPropertiesFromConfig, () => {
  it('should respect `configFields` order', () => {
    const gradleProperties = [];
    const ConfigToPropertyRules = [
      {
        propName: 'expo.jsEngine',
        configFields: ['ios.jsEngine', 'jsEngine'],
      },
    ];

    expect(
      updateAndroidBuildPropertiesFromConfig(
        { jsEngine: 'hermes', ios: { jsEngine: 'jsc' } },
        gradleProperties,
        ConfigToPropertyRules
      )
    ).toContainEqual({
      type: 'property',
      key: 'expo.jsEngine',
      value: 'jsc',
    });

    expect(
      updateAndroidBuildPropertiesFromConfig(
        { jsEngine: 'jsc', ios: { jsEngine: 'hermes' } },
        gradleProperties,
        ConfigToPropertyRules
      )
    ).toContainEqual({
      type: 'property',
      key: 'expo.jsEngine',
      value: 'hermes',
    });
  });
});

describe(updateAndroidBuildProperty, () => {
  it('should merge properties', () => {
    const gradleProperties: PropertiesItem[] = [
      { type: 'property', key: 'foo', value: 'foo' },
      { type: 'property', key: 'bar', value: 'bar' },
      { type: 'property', key: 'name', value: 'oldName' },
    ];
    expect(updateAndroidBuildProperty(gradleProperties, 'name', 'newName')).toEqual([
      { type: 'property', key: 'foo', value: 'foo' },
      { type: 'property', key: 'bar', value: 'bar' },
      { type: 'property', key: 'name', value: 'newName' },
    ]);
  });

  it('should keep original property when `value` is null by default', () => {
    const gradleProperties: PropertiesItem[] = [
      { type: 'property', key: 'foo', value: 'foo' },
      { type: 'property', key: 'bar', value: 'bar' },
    ];
    expect(updateAndroidBuildProperty(gradleProperties, 'bar', null)).toEqual([
      { type: 'property', key: 'foo', value: 'foo' },
      { type: 'property', key: 'bar', value: 'bar' },
    ]);
  });

  it('should remove original property when `value` is null when `removePropWhenValueIsNull` is true', () => {
    const gradleProperties: PropertiesItem[] = [
      { type: 'property', key: 'foo', value: 'foo' },
      { type: 'property', key: 'bar', value: 'bar' },
    ];
    expect(
      updateAndroidBuildProperty(gradleProperties, 'bar', null, {
        removePropWhenValueIsNull: true,
      })
    ).toEqual([{ type: 'property', key: 'foo', value: 'foo' }]);
  });
});
