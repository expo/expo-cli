function isObject(val) {
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

function enableWithPropertyOrConfig(prop, config, merge = false) {
  // Value is truthy.
  if (prop) {
    if (isObject(prop)) {
      // Merge config if necessary.
      if (merge) {
        return {
          ...config,
          ...prop,
        };
      }

      // Return property
      return prop;
    }

    // Value is truthy but not a replacement config, thus return the default config.
    return config;
  }
  // Return falsey.
  return prop;
}

/**
 * Used for features that are enabled by default unless specified otherwise.
 */
function overrideWithPropertyOrConfig(prop, config, merge = false) {
  if (prop === undefined) {
    return config;
  }
  return enableWithPropertyOrConfig(prop, config, merge);
}

module.exports = {
  enableWithPropertyOrConfig,
  overrideWithPropertyOrConfig,
};
