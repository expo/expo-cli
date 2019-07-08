function isObject(val: any): boolean {
  if (val === null) {
    return false;
  }
  return typeof val === 'function' || typeof val === 'object';
}

/**
 * Given a config option that could evalutate to true, config, or null; return a config.
 * e.g.
 * `polyfill: true` returns the `config`
 * `polyfill: {}` returns `{}`
 */

export function enableWithPropertyOrConfig(
  prop: any,
  config: boolean | { [key: string]: any },
  merge: boolean = false
): any {
  // Value is truthy but not a replacement config.
  if (prop) {
    if (isObject(prop) && merge) {
      if (config == null || typeof config !== 'object') {
        throw new Error('enableWithPropertyOrConfig cannot merge config: ' + config);
      }
      return {
        ...config,
        ...prop,
      };
    }
    // Return the default config
    return config;
  }
  // Return falsey or replacement config.
  return prop;
}

/**
 * Used for features that are enabled by default unless specified otherwise.
 */
export function overrideWithPropertyOrConfig(
  prop: any,
  config: boolean | { [key: string]: any },
  merge: boolean = false
): any {
  if (prop === undefined) {
    return config;
  }
  return enableWithPropertyOrConfig(prop, config, merge);
}
