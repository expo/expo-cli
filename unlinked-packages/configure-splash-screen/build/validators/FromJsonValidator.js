'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const lodash_1 = require('lodash');
/**
 * This class is responsible for validating configuration object in a form of json and produce validated object based on validating `rules` added via `addRule` method.
 */
class FromJsonValidator {
  constructor() {
    /**
     *  Records:
     * - keys are stringified array paths to the properties
     * - values are functions accepting
     */
    this.rules = [];
  }
  /**
   * Add rule that determined what property is copied from JSON object into actual validated object.
   * @param name an array describing property path (just like in lodash.get function)
   * @param validatingFunction optional parameter that is responsible for actual type conversion and semantic checking (e.g. check is given string is actually a path or a valid color). Not providing it results in copying over value without any semantic checking.
   */
  addRule(name, validatingFunction = value => value) {
    const idx = this.rules.findIndex(([propertyPath]) => propertyPath.join('.') === name.join('.'));
    if (idx === -1) {
      // @ts-ignore
      this.rules.push([name, validatingFunction]);
    } else {
      // @ts-ignore
      this.rules[idx] = [name, validatingFunction];
    }
    return this;
  }
  async validate(jsonConfig) {
    // @ts-ignore
    const config = {};
    const errors = [];
    for (const [propertyPath, validatingFunc] of this.rules) {
      try {
        const rawValue = lodash_1.get(jsonConfig, propertyPath);
        if (rawValue === undefined) {
          // No value for this propertyPath
          continue;
        }
        const value = await validatingFunc(rawValue, config);
        lodash_1.set(config, propertyPath, value);
      } catch (e) {
        errors.push([propertyPath, e]);
      }
    }
    if (errors.length > 0) {
      throw new Error(`Validating error:\n${this.formatErrors(errors)}`);
    }
    return config;
  }
  formatErrors(errors) {
    return errors
      .map(([propertyPath, error]) => {
        return `  '${propertyPath.map(el => String(el)).join('.')}': ${error.message}`;
      })
      .join('\n');
  }
}
exports.default = FromJsonValidator;
//# sourceMappingURL=FromJsonValidator.js.map
