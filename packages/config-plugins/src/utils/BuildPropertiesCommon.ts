import type { ExpoConfig } from '@expo/config-types';

/**
 * Rule to transform from config to build properties
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
 * If no value matched in the source config, will use the `jsc` default value in build properties.
 *
 */

export interface ConfigToPropertyRuleType {
  // Property name in `android/gradle.properties` or `ios/Podfile.properties.json`
  propName: string;

  // Query fields from the source config, using dot notation for nested field and first matched precedence.
  configFields: string[];

  // Default property value when no matched value from the source config
  defaultValue?: string;
}

/**
 * Source config can be either expo config or generic config
 */
export type BuildPropertiesConfig = Partial<ExpoConfig> | Record<string, any>;

/**
 * Find first matched field value from the `ConfigToPropertyRuleType.configFields`
 */
export function findFirstMatchedField(
  config: Record<string, any>,
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
export function getConfigFieldValue(config: Record<string, any>, field: string): string | null {
  const value = field.split('.').reduce((acc: Record<string, any>, key) => acc?.[key], config);
  if (value == null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error('The field value type is not string: ' + value);
  }
  return value;
}
