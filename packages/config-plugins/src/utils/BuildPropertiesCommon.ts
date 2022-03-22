import type { ExpoConfig } from '@expo/config-types';

/**
 * Rule to transform from expo config to build properties
 *
 * @example
 * ```
 * {
 *   propName: 'expo.jsEngine',
 *   configFields: ['android.jsEngine', 'jsEngine'],
 *   defaultValue: 'jsc',
 * }
 * ```
 * Will first lookup the `{ android: { jsEngine: 'XXX' } }` then the `{ jsEngine: 'XXX' }`
 * and update to `android/gradle.properties` / `ios/Podfile.properties.json`
 * with the `expo.jsEngine` name and the matched `XXX` value.
 * If no value matched in expo config, will use the `jsc` default value in build properties.
 *
 */
export interface ConfigToPropertyRuleType {
  // Property name in `android/gradle.properties` or `ios/Podfile.properties.json`
  propName: string;

  // Query fields from expo config, using dot notation for nested field and first matched precedence.
  configFields: string[];

  // Default property value when no matched value from expo config
  defaultValue?: string;
}

/**
 * Find first matched field value from the `ConfigToPropertyRuleType.configFields`
 */
export function findFirstMatchedField(
  config: Partial<ExpoConfig>,
  fields: string[]
): string | null {
  for (const field of fields) {
    const value = getConfigFieldValue(config, field);
    if (value) {
      return value;
    }
  }
  return null;
}

/**
 * Get config value from given field, using dot notation for nested object is supported.
 */
export function getConfigFieldValue(config: Partial<ExpoConfig>, field: string): string | null {
  const value = field.split('.').reduce((acc: Record<string, any>, key) => acc?.[key], config);
  if (value == null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error('The field value type is not string: ' + value);
  }
  return value;
}
